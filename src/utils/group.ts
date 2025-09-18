import { SearchResult } from "@/lib/supabase";

export interface GroupedResults {
  items: SearchResult[];
  buyers: SearchResult[];
  orders: SearchResult[];
}

export function groupResults(results: SearchResult[]): GroupedResults {
  const grouped: GroupedResults = {
    items: [],
    buyers: [],
    orders: [],
  };

  results.forEach((result) => {
    switch (result.kind) {
      case "item":
        grouped.items.push(result);
        break;
      case "buyer":
        grouped.buyers.push(result);
        break;
      case "order":
        grouped.orders.push(result);
        break;
    }
  });

  return grouped;
}

export function getSearchStats(grouped: GroupedResults) {
  return {
    total: grouped.items.length + grouped.buyers.length + grouped.orders.length,
    items: grouped.items.length,
    buyers: grouped.buyers.length,
    orders: grouped.orders.length,
  };
}
