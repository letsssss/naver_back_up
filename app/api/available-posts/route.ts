import { NextResponse, NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// CORS 헤더 설정을 위한 함수
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 캐시 방지 헤더 강화
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

// 사용 가능한 게시물을 위한 타입 정의
type AvailablePost = {
  id: number;
  title: string;
  content?: string;
  author_id?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  is_deleted?: boolean;
  ticket_price?: number;
  event_name?: string;
  event_date?: string;
  event_venue?: string;
  image_url?: string;
  user_id?: string;
};

// 포맷된 게시물 타입 정의
interface FormattedPost {
  id: number;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string | null;
  ticketPrice: number;
  eventName: string;
  eventDate: string | null;
  eventVenue: string | null;
  imageUrl: string | null;
  authorId: string | null;
}

// 작성자 정보 타입 정의
interface AuthorInfo {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  rating?: number;
}

// 작성자 맵 타입 정의
interface AuthorsMap {
  [key: string]: AuthorInfo;
}

// 작성자 정보가 포함된 게시물 타입 정의
interface PostWithAuthor extends FormattedPost {
  author: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
    rating: number;
  } | null;
}

/**
 * 구매 가능한 상품 목록을 제공하는 API
 * get_available_posts() 함수를 사용하여 이미 구매된 상품은 자동으로 제외됨
 */
export async function GET(req: NextRequest) {
  try {
    console.log("[사용 가능한 게시물 API] GET 요청 시작");
    
    // URL 쿼리 파라미터 추출
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    // 카테고리 파라미터 비활성화
    // const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    
    console.log(`[사용 가능한 게시물 API] 요청 파라미터: page=${page}, limit=${limit}, search=${search}`);
    
    // 페이지네이션 계산
    const offset = (page - 1) * limit;
    
    // Supabase Admin 클라이언트 생성
    const adminSupabase = createAdminClient();
    
    // RPC 함수 호출로 구매 가능한 게시물 가져오기
    // from('available_posts') 대신 rpc('get_available_posts') 사용
    // 먼저 rpc 함수 실행하여 구매 가능한 게시물 가져오기
    const { data: availablePosts, error: rpcError } = await adminSupabase
      .rpc('get_available_posts');
    
    if (rpcError) {
      console.error("[사용 가능한 게시물 API] RPC 함수 호출 오류:", rpcError);
      
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: '구매 가능한 게시물 목록을 조회하는 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? rpcError : undefined
      }, { status: 500 }));
    }
    
    // 함수에서 반환된 게시물에 필터 적용
    let filteredPosts = availablePosts || [];
    
    // 카테고리 필터링 비활성화
    /*
    // 카테고리 필터링 추가
    if (category) {
      console.log(`[사용 가능한 게시물 API] 카테고리 필터링: ${category}`);
      filteredPosts = filteredPosts.filter((post: any) => post.category === category);
    }
    */
    
    // 검색어 필터링 추가
    if (search) {
      console.log(`[사용 가능한 게시물 API] 검색어 필터링: ${search}`);
      const searchLower = search.toLowerCase();
      filteredPosts = filteredPosts.filter((post: any) => 
        (post.title && post.title.toLowerCase().includes(searchLower)) || 
        (post.content && post.content.toLowerCase().includes(searchLower))
      );
    }
    
    // 생성 날짜 기준 정렬 (내림차순)
    filteredPosts.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // 내림차순
    });
    
    // 페이지네이션 적용
    const totalCount = filteredPosts.length;
    const posts = filteredPosts.slice(offset, offset + limit);
    
    console.log(`[사용 가능한 게시물 API] 조회 성공: ${posts?.length || 0}개 게시물 발견 (총 ${totalCount}개 중)`);
    
    // 응답 데이터 구성 - 결과를 명시적인 타입으로 변환하여 처리
    const formattedPosts: FormattedPost[] = posts?.map((post: any) => ({
      id: post.id,
      title: post.title || '',
      content: post.content?.substring(0, 100) + (post.content && post.content.length > 100 ? '...' : '') || '',
      category: post.category || 'GENERAL',
      createdAt: post.created_at || new Date().toISOString(),
      updatedAt: post.updated_at || null,
      ticketPrice: post.ticket_price || 0,
      eventName: post.event_name || post.title || '',
      eventDate: post.event_date || null,
      eventVenue: post.event_venue || null,
      imageUrl: post.image_url || null,
      authorId: post.author_id || post.user_id || null
    })) || [];

    // 작성자 ID 목록 추출 (중복 제거)
    const authorIds = [...new Set(formattedPosts.map(post => post.authorId).filter(Boolean))];
    
    // 작성자 정보 조회
    let authorsMap: AuthorsMap = {};
    if (authorIds.length > 0) {
      console.log(`[사용 가능한 게시물 API] ${authorIds.length}명의 작성자 정보 조회 중...`);
      
      const { data: authorsData, error: authorsError } = await adminSupabase
        .from('profiles')  // 프로필 테이블에서 작성자 정보 조회
        .select('id, name, email, avatar_url, rating')
        .in('id', authorIds);
      
      if (authorsError) {
        console.error("[사용 가능한 게시물 API] 작성자 정보 조회 오류:", authorsError);
      } else if (authorsData) {
        // 작성자 정보를 맵으로 변환하여 빠르게 조회할 수 있도록 함
        authorsMap = authorsData.reduce<AuthorsMap>((acc, author) => {
          acc[author.id] = author;
          return acc;
        }, {});
        
        console.log(`[사용 가능한 게시물 API] ${authorsData.length}명의 작성자 정보 조회 성공`);
      }
    }
    
    // 작성자 정보를 게시물에 통합
    const postsWithAuthors: PostWithAuthor[] = formattedPosts.map(post => {
      // 작성자 ID로 작성자 정보 조회
      const authorInfo = post.authorId ? authorsMap[post.authorId] : null;
      
      // 최종 게시물 객체 구성
      return {
        ...post,
        author: authorInfo ? {
          id: authorInfo.id,
          name: authorInfo.name || '사용자',
          email: authorInfo.email,
          profileImage: authorInfo.avatar_url || null,
          rating: authorInfo.rating || 4.5 // 기본 평점 설정
        } : null
      };
    });
    
    return addCorsHeaders(NextResponse.json({
      success: true,
      posts: postsWithAuthors, // 작성자 정보가 포함된 게시물 반환
      pagination: {
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        hasMore: offset + (posts?.length || 0) < totalCount
      },
      filters: {
        search: search || null
      },
      source: 'get_available_posts_function' // 데이터 소스 표시 업데이트
    }, { status: 200 }));
  } catch (error) {
    console.error("[사용 가능한 게시물 API] 오류:", error);
    
    return addCorsHeaders(NextResponse.json({
      success: false,
      message: '게시물 목록을 조회하는 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 }));
  }
}

// OPTIONS 메서드 처리 (CORS 프리플라이트 요청을 위한)
export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}