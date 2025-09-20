"use client";

import { useState, useRef } from "react";
import { Upload, Search, FileSpreadsheet, Users, X } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelData {
  [key: string]: any;
}

interface SearchResult {
  row: number;
  data: ExcelData;
}

export default function Home() {
  const [excelData, setExcelData] = useState<ExcelData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [fileName, setFileName] = useState("");
  const [startRow, setStartRow] = useState(1);
  const [searchBy, setSearchBy] = useState<"all" | "serial">("all");
  const [autoDetectHeader, setAutoDetectHeader] = useState(false);
  const [detectedRowInfo, setDetectedRowInfo] = useState("");
  const [fixedHeaders, setFixedHeaders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
  const [clickedColumn, setClickedColumn] = useState<number | null>(null);

  // 경매장 엑셀의 고정 헤더 정의 (이미지 기준 - 17개 컬럼)
  const auctionHeaders = [
    "품명",
    "수량",
    "출품자",
    "비회원만 1번표기",
    "낙찰가",
    "낙찰자",
    "비회원만 1번표기",
    "유찰여부",
    "합계",
    "수수료율 판매자",
    "수수료율 구입자",
    "수수료 출품자",
    "수수료 낙찰자",
    "계",
    "매출액",
    "비고",
  ];

  // 컬럼 클릭 핸들러
  const handleColumnClick = (columnIndex: number | null) => {
    setClickedColumn(columnIndex);
  };

  // 행 클릭 핸들러 - 전체 데이터의 해당 행으로 스크롤
  const handleRowClick = (rowNumber: number) => {
    setHighlightedRow(rowNumber);

    // 전체 데이터 테이블로 스크롤
    const fullDataTable = document.getElementById("full-data-table");
    if (fullDataTable) {
      // 테이블 상단으로 스크롤
      fullDataTable.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      // 약간의 지연 후 해당 행으로 정확히 이동
      setTimeout(() => {
        const targetRow = document.querySelector(`tr[data-row="${rowNumber}"]`);
        if (targetRow) {
          targetRow.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 500);

      // 3초 후 하이라이트 제거
      setTimeout(() => {
        setHighlightedRow(null);
      }, 3000);
    }
  };

  // 초성 변환 함수
  const getInitials = (text: string): string => {
    const initials = [
      "ㄱ",
      "ㄲ",
      "ㄴ",
      "ㄷ",
      "ㄸ",
      "ㄹ",
      "ㅁ",
      "ㅂ",
      "ㅃ",
      "ㅅ",
      "ㅆ",
      "ㅇ",
      "ㅈ",
      "ㅉ",
      "ㅊ",
      "ㅋ",
      "ㅌ",
      "ㅍ",
      "ㅎ",
    ];

    return text
      .split("")
      .map((char) => {
        const code = char.charCodeAt(0) - 44032;
        if (code >= 0 && code <= 11171) {
          const initialIndex = Math.floor(code / 588);
          return initials[initialIndex] || char;
        }
        return char;
      })
      .join("");
  };

  // 한글을 영문으로 변환하는 함수 (완전한 매핑)
  const koreanToEnglish = (text: string): string => {
    // 한글 자모 분리 및 영문 변환
    const convertKoreanToEnglish = (char: string): string => {
      const code = char.charCodeAt(0);

      // 한글 범위 체크 (가-힣)
      if (code >= 0xac00 && code <= 0xd7a3) {
        const base = code - 0xac00;
        const 초성 = Math.floor(base / 588);
        const 중성 = Math.floor((base % 588) / 28);
        const 종성 = base % 28;

        const 초성Map = [
          "r",
          "R",
          "s",
          "e",
          "E",
          "f",
          "a",
          "q",
          "Q",
          "t",
          "T",
          "d",
          "w",
          "W",
          "c",
          "z",
          "x",
          "v",
          "g",
        ];
        const 중성Map = [
          "k",
          "o",
          "i",
          "O",
          "j",
          "p",
          "u",
          "P",
          "h",
          "hk",
          "ho",
          "hl",
          "y",
          "n",
          "nj",
          "np",
          "nl",
          "b",
          "m",
          "ml",
          "l",
        ];
        const 종성Map = [
          "",
          "r",
          "R",
          "rt",
          "s",
          "sw",
          "sg",
          "e",
          "f",
          "fr",
          "fa",
          "fq",
          "ft",
          "fx",
          "fv",
          "fg",
          "a",
          "q",
          "qt",
          "t",
          "T",
          "d",
          "w",
          "c",
          "z",
          "x",
          "v",
          "g",
        ];

        const 초성Char = 초성Map[초성] || "";
        const 중성Char = 중성Map[중성] || "";
        const 종성Char = 종성Map[종성] || "";

        return 초성Char + 중성Char + 종성Char;
      }

      // 초성만 있는 경우
      const 초성Map: { [key: string]: string } = {
        ㄱ: "r",
        ㄲ: "R",
        ㄴ: "s",
        ㄷ: "e",
        ㄸ: "E",
        ㄹ: "f",
        ㅁ: "a",
        ㅂ: "q",
        ㅃ: "Q",
        ㅅ: "t",
        ㅆ: "T",
        ㅇ: "d",
        ㅈ: "w",
        ㅉ: "W",
        ㅊ: "c",
        ㅋ: "z",
        ㅌ: "x",
        ㅍ: "v",
        ㅎ: "g",
      };

      return 초성Map[char] || char;
    };

    return text.split("").map(convertKoreanToEnglish).join("");
  };

  // 영어를 한글로 변환하는 함수 (역변환)
  const englishToKorean = (text: string): string => {
    // 간단한 역변환 매핑
    const engToKoreanMap: { [key: string]: string } = {
      r: "ㄱ",
      R: "ㄲ",
      s: "ㄴ",
      e: "ㄷ",
      E: "ㄸ",
      f: "ㄹ",
      a: "ㅁ",
      q: "ㅂ",
      Q: "ㅃ",
      t: "ㅅ",
      T: "ㅆ",
      d: "ㅇ",
      w: "ㅈ",
      W: "ㅉ",
      c: "ㅊ",
      z: "ㅋ",
      x: "ㅌ",
      v: "ㅍ",
      g: "ㅎ",
      k: "ㅏ",
      o: "ㅐ",
      i: "ㅑ",
      O: "ㅒ",
      j: "ㅓ",
      p: "ㅔ",
      u: "ㅕ",
      P: "ㅖ",
      h: "ㅗ",
      y: "ㅛ",
      n: "ㅜ",
      b: "ㅠ",
      m: "ㅡ",
      l: "ㅣ",
    };

    return text
      .split("")
      .map((char) => engToKoreanMap[char] || char)
      .join("");
  };

  // 순번 컬럼과 헤더 행을 자동으로 감지하는 함수
  const detectSerialColumnAndHeader = (
    worksheet: XLSX.WorkSheet
  ): { headerRow: number; serialColumn: number } => {
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
    let serialColumn = -1;
    let headerRow = 1;

    // 먼저 순번 컬럼을 찾기
    for (let col = range.s.c; col <= range.e.c; col++) {
      for (let row = range.s.r; row <= Math.min(range.e.r, 10); row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];

        if (cell && cell.v) {
          const cellValue = String(cell.v).toLowerCase();
          const trimmedValue = cellValue.trim();

          // 헤더 관련 키워드들을 확인 (순번 기준)
          if (
            cellValue.includes("순번") ||
            cellValue.includes("순 번") || // '순 번' (공백 포함) 키워드 추가
            cellValue.includes("품명") ||
            cellValue.includes("번호") ||
            cellValue.includes("no") ||
            cellValue.includes("number") ||
            trimmedValue === "순서" ||
            trimmedValue === "index" ||
            trimmedValue === "idx" ||
            trimmedValue === "item" ||
            trimmedValue === "항목"
          ) {
            serialColumn = col;
            headerRow = row + 1; // 헤더 행은 현재 행 (1-based index로 변환)

            // 이 행이 실제 헤더인지 확인 (다른 컬럼들도 텍스트인지 확인)
            let isHeaderRow = true;
            for (
              let checkCol = range.s.c;
              checkCol <= Math.min(range.e.c, col + 5);
              checkCol++
            ) {
              const checkCellAddress = XLSX.utils.encode_cell({
                r: row,
                c: checkCol,
              });
              const checkCell = worksheet[checkCellAddress];
              if (checkCell && checkCell.v) {
                const checkValue = String(checkCell.v).trim();
                // 숫자만 있는 경우 헤더가 아닐 가능성이 높음
                if (/^\d+$/.test(checkValue)) {
                  isHeaderRow = false;
                  break;
                }
              }
            }

            if (isHeaderRow) {
              break;
            }
          }
        }
      }
      if (serialColumn !== -1) break;
    }

    // 순번 컬럼을 찾지 못한 경우, 숫자 데이터가 있는 컬럼을 찾기
    if (serialColumn === -1) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        for (let row = range.s.r; row <= Math.min(range.e.r, 10); row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];

          if (cell && cell.v) {
            const cellValue = String(cell.v).trim();

            // 순수 숫자만 있는 경우 (1, 2, 3 등)
            if (/^\d+$/.test(cellValue)) {
              serialColumn = col;
              headerRow = row; // 숫자가 있는 행이 헤더
              break;
            }
          }
        }
        if (serialColumn !== -1) break;
      }
    }

    return {
      headerRow: headerRow || 1,
      serialColumn: serialColumn !== -1 ? serialColumn : 0,
    };
  };

  // 검색 함수
  const searchData = (term: string) => {
    if (!term.trim() || excelData.length === 0) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results: SearchResult[] = [];
    const lowerTerm = term.toLowerCase();
    const initialsTerm = getInitials(term);
    const englishTerm = koreanToEnglish(term);
    const koreanTerm = englishToKorean(term); // 영어를 한글로 역변환

    excelData.forEach((row, index) => {
      // 순번 검색 모드
      if (searchBy === "serial") {
        const serialNumber = String(row["순번"] || "").toLowerCase();
        if (serialNumber.includes(lowerTerm) || serialNumber === term) {
          results.push({ row: index + 1, data: row });
          return;
        }
      } else {
        // 전체 검색 모드
        const rowValues = Object.values(row)
          .map((value) => String(value).toLowerCase())
          .join(" ");

        // 일반 검색
        if (rowValues.includes(lowerTerm)) {
          results.push({ row: index + 1, data: row });
          return;
        }

        // 초성 검색
        if (rowValues.includes(initialsTerm.toLowerCase())) {
          results.push({ row: index + 1, data: row });
          return;
        }

        // 한글을 영문으로 변환한 검색
        if (rowValues.includes(englishTerm)) {
          results.push({ row: index + 1, data: row });
          return;
        }

        // 각 셀별로 다양한 검색 방식 적용
        Object.values(row).forEach((cellValue) => {
          const cellStr = String(cellValue);
          const cellInitials = getInitials(cellStr);
          const cellEnglish = koreanToEnglish(cellStr);
          const cellKorean = englishToKorean(cellStr);

          if (
            cellInitials.toLowerCase().includes(initialsTerm.toLowerCase()) ||
            cellStr.toLowerCase().includes(lowerTerm) ||
            cellEnglish.toLowerCase().includes(englishTerm.toLowerCase()) ||
            cellKorean.includes(koreanTerm) ||
            cellStr.toLowerCase().includes(term.toLowerCase())
          ) {
            if (!results.find((r) => r.row === index + 1)) {
              results.push({ row: index + 1, data: row });
            }
          }
        });
      }
    });

    setSearchResults(results);
    setIsSearching(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 자동 감지가 활성화된 경우 순번 컬럼과 헤더 행을 찾아서 설정
      let actualStartRow = startRow;
      if (autoDetectHeader) {
        const { headerRow, serialColumn } =
          detectSerialColumnAndHeader(worksheet);
        actualStartRow = headerRow;
        setStartRow(headerRow);
        setDetectedRowInfo(
          `순번 컬럼을 감지했습니다 (${
            serialColumn + 1
          }번째 컬럼, ${headerRow}행부터 데이터 읽기) - 헤더 행: ${
            headerRow - 1
          }행`
        );
      } else {
        setDetectedRowInfo("");
      }

      // 시작 행 설정 (헤더가 있는 경우 보통 2번째 줄부터)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        range: actualStartRow - 1, // 0-based index이므로 -1
        raw: false, // 원본 값 유지 (퍼센트, 날짜 등 포맷 보존)
        defval: "", // 빈 셀은 빈 문자열로 처리
      }) as ExcelData[];

      // 엑셀 데이터를 그대로 사용
      setExcelData(jsonData as ExcelData[]);
      setFixedHeaders([]);
      setSearchResults([]);
      setSearchTerm("");
    };

    reader.readAsBinaryString(file);
  };

  const clearData = () => {
    setExcelData([]);
    setSearchResults([]);
    setSearchTerm("");
    setFileName("");
    setStartRow(1);
    setSearchBy("all");
    setAutoDetectHeader(true);
    setDetectedRowInfo("");
    setFixedHeaders([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            📊 엑셀 검색 시스템
          </h1>
          <p className="text-lg text-gray-600">
            엑셀 파일을 업로드하고 다양한 방식으로 검색해보세요
          </p>
        </div>

        {/* 파일 업로드 섹션 */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              파일 업로드
            </h2>
            {fileName && (
              <button
                onClick={clearData}
                className="text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                초기화
              </button>
            )}
          </div>

          {/* 시작 행 설정 */}
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <label className="block text-base font-semibold text-gray-800 mb-3">
              📊 데이터 시작 행 설정
            </label>

            {/* 자동 감지 옵션 */}
            <div className="mb-4 p-3 bg-white border border-blue-200 rounded-lg">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={false}
                  disabled={true}
                  className="w-4 h-4 text-gray-400 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-500">
                  🔍 시작행 1로 고정 + 원본 엑셀 데이터 그대로 표시
                </span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <label className="text-base font-medium text-gray-800 whitespace-nowrap">
                  시작 행:
                </label>
                <input
                  type="number"
                  min="1"
                  value={1}
                  disabled={true}
                  className="w-24 px-4 py-3 border-2 border-gray-400 rounded-lg text-center text-lg font-semibold text-gray-800 shadow-sm bg-gray-100 text-gray-500"
                />
              </div>
              <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200 flex-1">
                <p className="font-medium mb-1">💡 가이드:</p>
                <>
                  <p>
                    • <span className="font-semibold">시작행 고정</span>:
                    1행부터 데이터 읽기
                  </p>
                  <p>
                    • <span className="font-semibold">원본 표시</span>: 엑셀
                    파일의 원본 헤더와 데이터를 그대로 표시
                  </p>
                </>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-400 bg-gray-50 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all duration-200">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <Upload className="w-12 h-12 text-gray-500" />
              <div>
                <p className="text-lg font-semibold text-gray-800">
                  엑셀 파일을 선택하거나 드래그하세요
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  .xlsx, .xls 파일만 지원됩니다
                </p>
              </div>
            </label>
          </div>

          {fileName && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-800 font-medium">
                    ✅ {fileName} 파일이 업로드되었습니다
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    총 {excelData.length}개의 행이 로드되었습니다 (시작 행:{" "}
                    {startRow}
                    {autoDetectHeader ? " - 자동 감지됨" : ""})
                  </p>
                  {detectedRowInfo && (
                    <p className="text-sm text-blue-600 mt-1">
                      ℹ️ {detectedRowInfo}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (fileInputRef.current?.files?.[0]) {
                      handleFileUpload({
                        target: { files: [fileInputRef.current.files[0]] },
                      } as any);
                    }
                  }}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                >
                  다시 읽기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 검색 섹션 */}
        {excelData.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Search className="w-6 h-6 text-blue-600" />
              검색
            </h2>

            {/* 검색 모드 선택 */}
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔍 검색 모드 선택
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="all"
                    checked={searchBy === "all"}
                    onChange={(e) =>
                      setSearchBy(e.target.value as "all" | "serial")
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    전체 검색 (모든 컬럼)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="serial"
                    checked={searchBy === "serial"}
                    onChange={(e) =>
                      setSearchBy(e.target.value as "all" | "serial")
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    순번 검색 (순번 컬럼만)
                  </span>
                </label>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  searchData(e.target.value);
                }}
                placeholder={
                  searchBy === "serial"
                    ? "순번을 입력하세요 (예: 1, 2, 3...)"
                    : "검색어를 입력하세요 (한글, 영문, 초성 모두 지원)"
                }
                className="w-full px-4 py-3 pr-12 border-2 border-gray-400 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-gray-800 placeholder-gray-500"
              />
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>💡 검색 팁:</p>
              {searchBy === "serial" ? (
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>순번 검색: "1" 입력하면 1번 항목의 모든 정보 표시</li>
                  <li>부분 검색: "10" 입력하면 10번대 순번들 검색</li>
                </ul>
              ) : (
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>한글 검색: "소나무" 입력</li>
                  <li>영문 검색: "thskan" 입력 (한영키 상관없이)</li>
                  <li>초성 검색: "ㅅㄴㅁ" 입력</li>
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 검색 결과 */}
        {searchTerm && (
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <span className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  검색 결과
                </span>
                <span className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-lg font-semibold">
                  {isSearching ? "검색 중..." : `${searchResults.length}개`}
                </span>
              </h2>
              <div className="text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                💡 행을 클릭하면 전체 데이터에서 해당 위치로 이동합니다
              </div>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>검색 결과가 없습니다</p>
              </div>
            ) : (
              <div className="overflow-x-auto border-2 border-gray-200 rounded-xl shadow-lg bg-white">
                <table className="w-full border-collapse bg-white">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-blue-500">
                      <th
                        className="border-2 border-gray-400 px-6 py-4 text-left font-bold text-white text-sm uppercase tracking-wider shadow-sm sticky top-0 bg-blue-500 cursor-pointer"
                        onClick={() => handleColumnClick(0)}
                      >
                        행 번호
                      </th>
                      {excelData.length > 0 &&
                        Object.keys(excelData[0]).map((key, index) => (
                          <th
                            key={index}
                            className="border-2 border-gray-400 px-6 py-4 text-left font-bold text-white text-sm uppercase tracking-wider shadow-sm sticky top-0 bg-blue-500 cursor-pointer"
                            onClick={() => handleColumnClick(index + 1)}
                          >
                            {key}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {searchResults.map((result, index) => (
                      <tr
                        key={index}
                        onClick={() => handleRowClick(result.row)}
                        className="hover:bg-green-100 transition-all duration-0 hover:shadow-md hover:scale-[1.01] group cursor-pointer"
                      >
                        <td
                          className={`border-2 border-gray-300 px-4 py-4 font-bold text-black bg-blue-50 group-hover:bg-green-100 transition-colors duration-0 min-w-[80px] ${
                            clickedColumn === 0 ? "bg-yellow-100" : ""
                          }`}
                        >
                          {result.row}
                        </td>
                        {Object.values(result.data).map((value, cellIndex) => (
                          <td
                            key={cellIndex}
                            className={`border-2 border-gray-300 px-2 py-4 text-black font-bold bg-white group-hover:bg-green-100 transition-colors duration-0 w-auto whitespace-nowrap ${
                              clickedColumn === cellIndex + 1
                                ? "bg-yellow-100"
                                : ""
                            }`}
                          >
                            <span className="text-sm font-medium">{value}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 전체 데이터 테이블 */}
        {excelData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-md">
                📊 전체 데이터
              </span>
              <span className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-lg font-semibold">
                {excelData.length}행
              </span>
            </h2>
            <div
              id="full-data-table"
              className="overflow-x-auto overflow-y-auto border-2 border-gray-200 rounded-xl shadow-lg bg-white max-h-[90vh]"
            >
              <table className="w-full border-collapse bg-white">
                <tbody className="divide-y divide-gray-200">
                  {excelData.map((row, index) => (
                    <tr
                      key={index}
                      data-row={index + 1}
                      className={`hover:bg-green-100 transition-all duration-0 hover:shadow-md hover:scale-[1.01] group ${
                        highlightedRow === index + 1
                          ? "bg-yellow-200 shadow-lg scale-[1.02] border-2 border-yellow-400"
                          : ""
                      } ${
                        index === 2
                          ? "sticky top-0 z-20 bg-green-500 shadow-lg"
                          : ""
                      }`}
                    >
                      <td
                        className={`border-2 border-gray-300 px-4 py-4 font-bold text-black bg-green-50 group-hover:bg-green-100 transition-colors duration-0 min-w-[80px] ${
                          index === 2
                            ? "sticky top-0 z-20 bg-green-500 text-black font-bold"
                            : ""
                        } ${index === 2 ? "font-bold" : ""} ${
                          clickedColumn === 0 ? "bg-yellow-100" : ""
                        }`}
                        onClick={() => handleColumnClick(0)}
                      >
                        {index + 1}
                      </td>
                      {Object.values(row).map((value, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={`border-2 border-gray-300 px-2 py-4 text-black font-bold ${
                            index === 2 ? "bg-green-500" : "bg-white"
                          } group-hover:bg-green-100 transition-colors duration-0 w-auto whitespace-nowrap ${
                            index === 2
                              ? "sticky top-0 z-20 text-black font-bold"
                              : ""
                          } ${index === 2 ? "font-bold" : ""} ${
                            clickedColumn === cellIndex + 1
                              ? "bg-yellow-100"
                              : ""
                          }`}
                          onClick={() => handleColumnClick(cellIndex + 1)}
                        >
                          <span className="text-sm font-medium">{value}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
