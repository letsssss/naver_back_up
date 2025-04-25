"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, Calendar, MapPin, Clock, ArrowRight, Star, AlertCircle, RefreshCw, TicketX } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { NotificationDropdown } from "@/components/notification-dropdown"

const categories = [
  { name: "콘서트", href: "/category/콘서트" },
  { name: "뮤지컬/연극", href: "/category/뮤지컬-연극" },
  { name: "스포츠", href: "/category/스포츠" },
  { name: "전시/행사", href: "/category/전시-행사" },
]

// API에서 가져온 데이터의 타입 정의
interface Post {
  id: number;
  title: string;
  content: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  ticketPrice: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

// 인기 티켓 데이터 타입 정의
interface PopularTicket {
  id: number;
  rank: number;
  artist: string;
  date: string;
  venue: string;
}

export default function TicketCancellationPage() {
  const { user, logout } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("all")
  const [mounted, setMounted] = useState(false)
  const [tickets, setTickets] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [popularTickets, setPopularTickets] = useState<PopularTicket[]>([])

  useEffect(() => {
    setMounted(true)
    fetchCancellationTickets()
    
    // 인기 티켓 데이터 설정
    setPopularTickets([
      {
        id: 1,
        rank: 1,
        artist: "세븐틴",
        date: "25.03.20 ~ 25.03.21",
        venue: "잠실종합운동장 주경기장",
      },
      {
        id: 2,
        rank: 2,
        artist: "데이식스 (DAY6)",
        date: "25.02.01 ~ 25.03.30",
        venue: "전국투어",
      },
      {
        id: 3,
        rank: 3,
        artist: "아이브",
        date: "25.04.05 ~ 25.04.06",
        venue: "KSPO DOME",
      },
      {
        id: 4,
        rank: 4,
        artist: "웃는 남자",
        date: "25.01.09 ~ 25.03.09",
        venue: "예술의전당 오페라극장",
      },
    ])
  }, [])

  // 취켓팅 가능 티켓 가져오기
  const fetchCancellationTickets = async () => {
    try {
      setLoading(true)
      setError("")
      console.log("취켓팅 가능 티켓 불러오기 시작...")
      
      // API 호출을 available-posts로 변경
      let apiUrl = '/api/available-posts' // 변경됨: /api/posts -> /api/available-posts
      console.log("수정된 API 호출 (구매 가능한 게시물):", apiUrl)
      
      // 캐시 방지를 위한 타임스탬프 추가
      const timestamp = Date.now();
      apiUrl = `${apiUrl}?t=${timestamp}`;
      
      let response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store',
        next: { revalidate: 0 } // 데이터 재검증 비활성화
      })
      
      console.log("API 응답 상태:", response.status)
      let data = await response.json()
      console.log("전체 게시물 수:", data.posts?.length || 0)
      console.log("데이터 소스:", data.source || "알 수 없음");
      
      if (!data.posts || data.posts.length === 0) {
        console.log("게시물이 없습니다. API 응답:", data);
        setTickets([]);
        setLoading(false);
        return;
      }
      
      // 모든 게시물 검사
      console.log("모든 게시물 세부 정보:", data.posts);
      
      // 각 게시물의 구조를 검사
      data.posts.forEach((post: any, index: number) => {
        console.log(`[게시물 ${index + 1}] ID: ${post.id}`);
        console.log(`- 제목: ${post.title}`);
        console.log(`- 카테고리: ${post.category || '카테고리 없음'}`);
        console.log(`- 작성자: ${post.author?.name || '작성자 정보 없음'}`);
        
        // content가 JSON 문자열인 경우 파싱 시도
        try {
          if (typeof post.content === 'string' && (post.content.startsWith('{') || post.content.startsWith('['))) {
            const contentObj = JSON.parse(post.content);
            console.log(`- 콘텐츠: JSON 파싱 성공`, contentObj);
          }
        } catch (e) {
          // JSON 파싱 실패는 무시
        }
      });
      
      // 모든 게시물의 카테고리 확인
      const sampleCategories = [...new Set(data.posts.map((p: any) => p.category))].filter(Boolean)
      console.log("발견된 카테고리 목록:", sampleCategories)
      
      // 모든 게시물 표시 (카테고리 필터 없이)
      console.log("카테고리 필터 없이 모든 게시물 표시");
      setTickets(data.posts);
    } catch (err) {
      console.error("취켓팅 티켓 불러오기 오류:", err)
      setError("데이터를 불러오는데 실패했습니다.")
      setTickets([]);
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      toast("검색어를 입력해주세요", {
        description: "검색어를 입력하고 다시 시도해주세요.",
      })
      return
    }
    
    // 카테고리 및 검색어를 포함하여 검색 페이지로 이동
    router.push(`/search?query=${encodeURIComponent(searchQuery)}&category=ticket-cancellation`)
  }

  const handleLogin = () => {
    router.push("/login")
  }

  // 초기 렌더링을 위한 더미 UI 컴포넌트
  const AuthButtons = () => {
    // mounted 상태가 아닐 때는 아무것도 표시하지 않음
    if (!mounted) {
      return null;
    }

    if (user) {
      return (
        <>
          <button
            onClick={logout}
            className="text-gray-700 hover:text-[#0061FF] transition-colors whitespace-nowrap"
          >
            로그아웃
          </button>
          <button
            onClick={() => router.push('/mypage')}
            className="text-gray-700 hover:text-[#0061FF] transition-colors whitespace-nowrap"
          >
            마이페이지
          </button>
        </>
      );
    }

    return (
      <button
        onClick={handleLogin}
        className="text-gray-700 hover:text-[#0061FF] transition-colors whitespace-nowrap"
      >
        로그인
      </button>
    );
  };

  // 티켓 가격 추출 helper 함수
  const getTicketPrice = (ticket: Post): number => {
    // 1. ticket_price 필드 확인 (데이터베이스 필드명)
    if ((ticket as any).ticket_price && !isNaN(Number((ticket as any).ticket_price))) {
      return Number((ticket as any).ticket_price);
    }
    
    // 2. ticketPrice 필드 확인 (프론트엔드 필드명)
    if (ticket.ticketPrice && !isNaN(Number(ticket.ticketPrice))) {
      return Number(ticket.ticketPrice);
    }
    
    // 3. 콘텐츠에서 가격 추출 시도
    try {
      if (typeof ticket.content === 'string' && ticket.content.startsWith('{')) {
        const contentObj = JSON.parse(ticket.content);
        
        // 3.1 콘텐츠 객체의 price 필드 확인
        if (contentObj.price && !isNaN(Number(contentObj.price))) {
          return Number(contentObj.price);
        }
        
        // 3.2 sections 배열에서 첫 번째 항목 확인
        if (contentObj.sections && contentObj.sections.length > 0 && contentObj.sections[0].price) {
          return Number(contentObj.sections[0].price);
        }
      }
    } catch (e) {
      // JSON 파싱 오류는 무시
      console.log('콘텐츠 파싱 오류:', e);
    }
    
    // 가격 정보가 없는 경우 기본값 0 반환
    return 0;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="w-full bg-white shadow-sm">
        <div className="container mx-auto px-4 overflow-x-auto">
          <div className="flex h-16 items-center justify-between min-w-[768px]">
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-2xl font-bold text-[#0061FF] whitespace-nowrap">
                이지티켓
              </Link>
              <Link
                href="/proxy-ticketing"
                className="text-gray-700 hover:text-[#0061FF] transition-colors border-r pr-6 whitespace-nowrap"
              >
                대리티켓팅
              </Link>
              <Link
                href="/ticket-cancellation"
                className="text-[#0061FF] transition-colors border-r pr-6 whitespace-nowrap font-medium"
              >
                취켓팅
              </Link>
              <Link href="/tickets" className="text-gray-700 hover:text-[#0061FF] transition-colors whitespace-nowrap">
                티켓 구매/판매
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              {mounted && user ? (
                <>
                  <div className="text-gray-700">
                    <span className="font-medium text-[#0061FF]">{user.name}</span>님 환영합니다
                  </div>
                  <NotificationDropdown />
                  <AuthButtons />
                  <Link href="/cart" className="text-gray-700 hover:text-[#0061FF] transition-colors whitespace-nowrap">
                    장바구니
                  </Link>
                </>
              ) : mounted ? (
                <AuthButtons />
              ) : (
                // 마운트되기 전에는 아무것도 렌더링하지 않음
                <div className="invisible">로딩 중...</div>
              )}
              <button
                onClick={() => router.push("/sell")}
                className="px-4 py-2 bg-[#0061FF] text-white rounded-xl hover:bg-[#0052D6] transition-colors whitespace-nowrap"
              >
                취켓팅 등록
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#0061FF] to-[#60A5FA] relative overflow-hidden">
        <section className="container mx-auto flex flex-col items-center justify-center py-16 px-4 relative z-10">
          <div className="mb-4 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm">
            취소표 예매 성공률 98%
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white text-center mb-4 leading-tight">
            놓친 티켓, 취소표로 다시 잡자!
          </h1>
          <p className="text-base md:text-lg text-white/90 text-center mb-8 max-w-xl">
            본인 계정으로 안전하게, 빠르게 예매완료!
            <br />
            안전한 입장까지 도와드립니다.
          </p>
          <form onSubmit={handleSearch} className="w-full max-w-md flex flex-col sm:flex-row gap-2">
            <Input
              type="search"
              placeholder="이벤트, 아티스트, 팀 검색"
              className="flex-1 h-12 rounded-lg sm:rounded-r-none border-0 bg-white text-black placeholder:text-gray-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="검색어 입력"
            />
            <Button
              type="submit"
              className="h-12 px-8 rounded-none sm:rounded-l-none bg-[#FFD600] hover:bg-[#FFE600] text-black font-medium transition-colors"
              style={{ borderTopRightRadius: '0.5rem', borderBottomRightRadius: '0.5rem', borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }}
            >
              <Search className="w-5 h-5 mr-2" />
              검색
            </Button>
          </form>
        </section>
      </div>

      {/* 카테고리 섹션 */}
      <section className="bg-white py-6 border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-center space-x-4 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="px-4 py-2 text-gray-700 hover:text-[#0061FF] transition-colors whitespace-nowrap"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 취켓팅 가능 공연 섹션 */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">
              취켓팅 <span className="text-[#FF2F6E]">가능</span> 공연
            </h2>
            <p className="text-gray-600 mt-2">취소표 예매 서비스로 놓친 티켓을 다시 잡으세요!</p>
          </div>

          <Tabs defaultValue="all" className="mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="all" onClick={() => setActiveTab("all")}>
                전체
              </TabsTrigger>
              <TabsTrigger value="concert" onClick={() => setActiveTab("concert")}>
                콘서트
              </TabsTrigger>
              <TabsTrigger value="musical" onClick={() => setActiveTab("musical")}>
                뮤지컬/연극
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF2F6E]"></div>
              <span className="ml-3 text-gray-600">취켓팅 가능한 공연을 불러오는 중...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg text-gray-800 mb-2">데이터를 불러오는데 실패했습니다</p>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={() => fetchCancellationTickets()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                다시 시도
              </Button>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <TicketX className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-xl text-gray-700 mb-4">현재 취켓팅 가능한 공연이 없습니다</p>
              <p className="text-gray-600">나중에 다시 확인해주세요</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <Link href={`/ticket-cancellation/${ticket.id}`} className="cursor-pointer block">
                    <Image
                      src={ticket.image || "/placeholder.svg"}
                      alt={ticket.title}
                      width={400}
                      height={200}
                      className="w-full h-48 object-cover"
                    />
                  </Link>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{ticket.title}</h3>
                    <p className="text-gray-600 mb-2">{ticket.eventName || ticket.title}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                      <span>
                        {ticket.eventDate}
                      </span>
                      <span>{ticket.eventVenue}</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-black">{Number(getTicketPrice(ticket)).toLocaleString()}원</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <span className="text-gray-600">판매자: </span>
                        <span className="ml-1 text-blue-600 hover:underline">{ticket.author?.name || '판매자 정보 없음'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 취켓팅 서비스 설명 섹션 */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold mb-6">취켓팅 서비스란?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-[#0061FF]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">안전한 입장</h3>
                <p className="text-gray-600">본인 인증으로부터 안전하게 입장할 수 있습니다.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-[#0061FF]"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">안전한 예매 대행</h3>
                <p className="text-gray-600">본인 계정으로 안정하게 예매 대행을 해드립니다.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-[#0061FF]"
                  >
                    <path d="M12 8c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5Z" />
                    <path d="m3 3 18 18" />
                    <path d="M10.5 13.5 7 10" />
                    <path d="m7 16 3.5-3.5" />
                    <path d="M10.5 13.5 17 20" />
                    <path d="m14 7 3 3" />
                    <path d="M14 13v-3" />
                    <path d="M10 13v-1" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">높은 성공률</h3>
                <p className="text-gray-600">98% 이상의 높은 예매 성공률을 자랑합니다.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 인기 티켓 섹션 */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">
            오늘의 <span className="text-[#FF2F6E]">인기</span> 티켓
          </h2>
          <div className="space-y-4">
            {popularTickets.map((ticket, index) => (
              <div key={ticket.id}>
                <div className="flex items-center py-4 px-4 hover:bg-gray-50 transition-colors cursor-pointer rounded-lg">
                  <span className="text-[#FF2F6E] font-bold text-xl md:text-2xl w-12 md:w-16">{ticket.rank}</span>
                  <div className="flex-1">
                    <Link href={`/ticket/${ticket.id}`}>
                      <h3 className="font-medium text-base md:text-lg mb-1">{ticket.artist}</h3>
                    </Link>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                      <span>{ticket.date}</span>
                      <span>•</span>
                      <span>{ticket.venue}</span>
                    </div>
                  </div>
                </div>
                {index < popularTickets.length - 1 && <div className="border-b border-gray-200 my-2"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

