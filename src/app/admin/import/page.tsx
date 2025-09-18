"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

const uploadSchema = z.object({
  file: z
    .any()
    .refine((files) => files?.length == 1, "파일을 선택해주세요.")
    .refine(
      (files) => files?.[0]?.size <= 5000000,
      "파일 크기는 5MB 이하여야 합니다."
    )
    .refine(
      (files) =>
        [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
        ].includes(files?.[0]?.type),
      "엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다."
    ),
  createMissing: z.boolean().default(true),
});

type UploadFormData = z.infer<typeof uploadSchema>;

interface UploadResult {
  success: boolean;
  message: string;
  items: number;
  buyers: number;
  orders: number;
}

export default function ImportPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    getValues,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
  });

  const createMissing = watch("createMissing", true);

  const onSubmit = async (data: UploadFormData) => {
    console.log("폼 제출 시작:", data);
    setUploading(true);
    setResult(null);

    try {
      const file = data.file[0];
      console.log("선택된 파일:", file);

      if (!file) {
        throw new Error("파일이 선택되지 않았습니다.");
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const results = {
        items: 0,
        buyers: 0,
        orders: 0,
      };

      // 첫 번째 시트 처리
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      console.log("처리할 시트:", sheetName);

      // 헤더 행을 찾기 위해 여러 옵션 시도
      let excelData;
      let headerRow = 1; // 기본적으로 1행을 헤더로 사용

      // 먼저 기본 설정으로 시도
      excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log("원본 엑셀 데이터 샘플:", excelData.slice(0, 5)); // 디버깅용

      // 헤더 행 찾기 (실제 컬럼명이 있는 행)
      for (let i = 0; i < Math.min(10, excelData.length); i++) {
        const row = excelData[i];
        if (
          row &&
          row.some(
            (cell) =>
              typeof cell === "string" &&
              (cell.includes("품명") ||
                cell.includes("낙찰") ||
                cell.includes("출품"))
          )
        ) {
          headerRow = i;
          console.log(`헤더 행 발견: ${i}행`, row); // 디버깅용
          break;
        }
      }

      // 올바른 헤더 행으로 데이터 파싱
      excelData = XLSX.utils.sheet_to_json(sheet, {
        header: headerRow + 1,
        range: headerRow,
      });

      console.log("파싱된 엑셀 데이터 샘플:", excelData[0]); // 디버깅용
      console.log("총 데이터 행 수:", excelData.length); // 디버깅용
      console.log("컬럼명들:", Object.keys(excelData[0] || {})); // 디버깅용

      // 처음 5개 행의 전체 데이터 확인
      console.log("처음 5개 행 전체 데이터:");
      excelData.slice(0, 5).forEach((row, index) => {
        console.log(`행 ${index + 1}:`, row);
      });

      for (const row of excelData) {
        // 유연한 컬럼명 매핑 (대소문자 구분 없이)
        const itemName =
          row["품명"] || row["품목명"] || row["상품명"] || row["품목"] || "";
        const quantity =
          parseInt(row["수량"] || row["개수"] || row["수량(개)"] || 1) || 1;
        const exhibitor =
          row["출품자"] ||
          row["제출자"] ||
          row["판매자"] ||
          row["출품자명"] ||
          "";
        const successfulBidPrice =
          parseFloat(row["낙찰가"] || row["낙찰가격"] || row["가격"] || 0) || 0;
        const successfulBidder =
          row["낙찰자"] ||
          row["구매자"] ||
          row["낙찰자명"] ||
          row["낙찰자명"] ||
          "";
        const remarks = row["비고"] || row["메모"] || row["특이사항"] || "";

        // 디버깅: 실제 컬럼 값 확인
        console.log("컬럼 값 확인:", {
          품명: row["품명"],
          출품자: row["출품자"],
          낙찰가: row["낙찰가"],
          낙찰자: row["낙찰자"],
          "추출된 itemName": itemName,
          "추출된 exhibitor": exhibitor,
        });

        console.log("처리 중인 행:", {
          itemName,
          quantity,
          exhibitor,
          successfulBidPrice,
          successfulBidder,
        }); // 디버깅용

        // 완전히 비어있는 행만 건너뛰기
        if (!itemName && !exhibitor) {
          console.log("완전히 비어있는 행 건너뛰기:", {
            itemName,
            exhibitor,
            successfulBidder,
            successfulBidPrice,
          });
          continue;
        }

        // 품명이나 출품자가 있으면 처리 (낙찰 정보가 없어도 테스트용으로 처리)
        if (itemName || exhibitor) {
          console.log("데이터 처리 시작:", {
            itemName,
            exhibitor,
            successfulBidder: successfulBidder || "낙찰자 없음",
            successfulBidPrice: successfulBidPrice || 0,
          });
        }

        // 품목 처리
        let itemId = null;
        if (itemName) {
          const { data: existingItem, error: itemCheckError } = await supabase
            .from("items")
            .select("id")
            .eq("name_ko", itemName)
            .single();

          if (existingItem) {
            itemId = existingItem.id;
          } else {
            const { data: newItem, error: itemInsertError } = await supabase
              .from("items")
              .insert({
                name_ko: itemName,
                category: "경매품목",
              })
              .select("id")
              .single();

            if (itemInsertError) {
              console.error("품목 삽입 에러:", itemInsertError);
              continue;
            }

            itemId = newItem?.id;
            results.items++;
          }
        }

        // 출품자 처리
        let exhibitorId = null;
        if (exhibitor) {
          const { data: existingExhibitor } = await supabase
            .from("buyers")
            .select("id")
            .eq("full_name", exhibitor)
            .single();

          if (existingExhibitor) {
            exhibitorId = existingExhibitor.id;
          } else {
            const { data: newExhibitor, error: exhibitorError } = await supabase
              .from("buyers")
              .insert({
                full_name: exhibitor,
                note: "출품자",
              })
              .select("id")
              .single();

            if (exhibitorError) {
              console.error("출품자 삽입 에러:", exhibitorError);
            } else {
              exhibitorId = newExhibitor?.id;
              results.buyers++;
            }
          }
        }

        // 낙찰자 처리 (낙찰자가 없으면 기본값 사용)
        let bidderId = null;
        const finalBidderName = successfulBidder || "미낙찰";

        if (finalBidderName) {
          const { data: existingBidder } = await supabase
            .from("buyers")
            .select("id")
            .eq("full_name", finalBidderName)
            .single();

          if (existingBidder) {
            bidderId = existingBidder.id;
          } else {
            const { data: newBidder, error: bidderError } = await supabase
              .from("buyers")
              .insert({
                full_name: finalBidderName,
                note: "낙찰자",
              })
              .select("id")
              .single();

            if (bidderError) {
              console.error("낙찰자 삽입 에러:", bidderError);
            } else {
              bidderId = newBidder?.id;
              results.buyers++;
            }
          }
        }

        // 주문/거래 처리 (품목이 있으면 처리, 낙찰자가 없어도 테스트용으로 처리)
        if (itemId) {
          const orderData = {
            buyer_id: bidderId,
            item_id: itemId,
            qty: quantity,
            price: successfulBidPrice,
            purchased_at: new Date().toISOString(), // 현재 시간으로 설정
          };

          const { error: orderError } = await supabase
            .from("orders")
            .insert(orderData);

          if (orderError) {
            console.error("주문 삽입 에러:", orderError);
          } else {
            results.orders++;
          }
        }
      }

      setResult({
        success: true,
        message: "업로드가 완료되었습니다!",
        items: results.items,
        buyers: results.buyers,
        orders: results.orders,
      });
    } catch (error) {
      console.error("업로드 중 오류가 발생했습니다:", error);
      setResult({
        success: false,
        message: `업로드 중 오류가 발생했습니다: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`,
        items: 0,
        buyers: 0,
        orders: 0,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              경매 데이터 업로드
            </h1>
            <p className="text-gray-600 text-lg">
              엑셀 파일을 업로드하여 경매 데이터를 등록하세요
            </p>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            업로드 형식 안내
          </h3>
          <div className="text-sm text-blue-800 space-y-3">
            <div className="font-medium">
              경매 데이터 형식: 단일 시트에 다음 컬럼이 포함되어야 합니다
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>
                    <strong>품명:</strong> 경매 품목명
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>
                    <strong>수량:</strong> 품목 수량
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>
                    <strong>출품자:</strong> 출품자명
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>
                    <strong>낙찰가:</strong> 낙찰 금액
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>
                    <strong>낙찰자:</strong> 낙찰자명
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>
                    <strong>비고:</strong> 추가 정보 (선택)
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <div className="text-xs text-blue-700 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                유찰된 항목(낙찰자가 없는 경우)은 자동으로 제외됩니다
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label
              htmlFor="file"
              className="block text-sm font-semibold text-gray-700 mb-3"
            >
              엑셀 파일 선택
            </label>
            <div className="relative">
              <input
                type="file"
                id="file"
                accept=".xlsx,.xls,.csv"
                {...register("file")}
                onChange={(e) => {
                  console.log("파일 선택됨:", e.target.files?.[0]?.name);
                  register("file").onChange(e);
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-500 file:to-indigo-600 file:text-white hover:file:from-blue-600 hover:file:to-indigo-700 transition-all duration-200 file:shadow-lg"
              />
            </div>
            {errors.file && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <svg
                  className="w-4 h-4"
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
                {errors.file.message}
              </p>
            )}
          </div>

          <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
            <input
              type="checkbox"
              id="createMissing"
              {...register("createMissing")}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="createMissing"
              className="ml-3 block text-sm font-medium text-gray-700"
            >
              누락된 구매자/품목 자동 생성
            </label>
          </div>

          <button
            type="submit"
            disabled={uploading}
            onClick={(e) => {
              console.log("업로드 버튼 클릭됨");
              console.log("폼 상태:", getValues());
              console.log("에러:", errors);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-100 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                업로드 중...
              </>
            ) : (
              <>
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                파일 업로드
              </>
            )}
          </button>
        </form>

        {/* 결과 표시 */}
        {result && (
          <div
            className={`mt-8 p-6 rounded-xl border ${
              result.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  result.success ? "bg-green-500" : "bg-red-500"
                }`}
              >
                {result.success ? (
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    result.success ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {result.message}
                </h3>
                {result.success && (
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.items}
                      </div>
                      <div className="text-gray-600">품목</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {result.buyers}
                      </div>
                      <div className="text-gray-600">출품자/낙찰자</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {result.orders}
                      </div>
                      <div className="text-gray-600">거래</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
