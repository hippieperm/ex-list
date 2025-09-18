"use client";

import { useSearch } from "@/hooks/useSearch";
import { groupResults, getSearchStats } from "@/utils/group";

export default function HomePage() {
  const { query, setQuery, results, loading, error } = useSearch();
  const grouped = groupResults(results);
  const stats = getSearchStats(grouped);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              경매 데이터 검색
            </h1>
            <p className="text-gray-600 text-lg">
              품목, 출품자, 낙찰자 정보를 한 번에 검색하세요
            </p>
          </div>
        </div>
      </div>

      {/* 검색 영역 */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="h-6 w-6 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="품목명, 출품자명, 낙찰자명 또는 초성(예: ㅅㄴㅁ)으로 검색..."
              className="w-full pl-12 pr-16 py-4 text-lg border-2 border-gray-200 rounded-2xl bg-white/80 backdrop-blur-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all duration-200 shadow-lg hover:shadow-xl"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* 검색 통계 */}
        {query && (
          <div className="mb-8 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">
                  품목: <strong>{stats.items}</strong>개
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">
                  출품자/낙찰자: <strong>{stats.buyers}</strong>명
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">
                  거래: <strong>{stats.orders}</strong>건
                </span>
              </div>
              <div className="text-gray-600">
                총 <strong>{stats.total}</strong>개 결과
              </div>
            </div>
          </div>
        )}

        {/* 검색 결과 */}
        {query && !loading && stats.total === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              검색 결과가 없습니다
            </h3>
            <p className="text-gray-500">다른 검색어를 시도해보세요</p>
          </div>
        )}

        {stats.total > 0 && (
          <div className="space-y-8">
            {/* 품목 결과 */}
            {grouped.items.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  품목 ({grouped.items.length}개)
                </h2>
                <div className="grid gap-3">
                  {grouped.items.map((item) => (
                    <div
                      key={`item-${item.id}`}
                      className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {item.category}
                          </p>
                        </div>
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                          품목
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 출품자/낙찰자 결과 */}
            {grouped.buyers.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  출품자/낙찰자 ({grouped.buyers.length}명)
                </h2>
                <div className="grid gap-3">
                  {grouped.buyers.map((buyer) => (
                    <div
                      key={`buyer-${buyer.id}`}
                      className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {buyer.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {buyer.category}
                          </p>
                        </div>
                        <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          {buyer.category.includes("출품자")
                            ? "출품자"
                            : "낙찰자"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 거래 결과 */}
            {grouped.orders.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  거래 내역 ({grouped.orders.length}건)
                </h2>
                <div className="grid gap-3">
                  {grouped.orders.map((order) => (
                    <div
                      key={`order-${order.id}`}
                      className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {order.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {order.category}
                          </p>
                        </div>
                        <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                          거래
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 초기 화면 */}
        {!query && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              통합 검색 시스템
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
              경매 데이터를 쉽게 검색하세요. 품목명, 출품자명, 낙찰자명을 한
              번에 검색할 수 있으며, 한글과 영문을 구분하지 않고 초성 검색도
              지원합니다.
            </p>
            <div className="mt-8 grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">통합 검색</h3>
                <p className="text-sm text-gray-600">
                  품목, 출품자, 낙찰자를 한 번에 검색
                </p>
              </div>
              <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">한영 무관</h3>
                <p className="text-sm text-gray-600">
                  한글과 영문을 구분하지 않고 검색
                </p>
              </div>
              <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                    />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">초성 검색</h3>
                <p className="text-sm text-gray-600">
                  초성만으로도 빠른 검색 가능
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
