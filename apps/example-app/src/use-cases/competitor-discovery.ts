import { tracer } from "../tracer";

/**
 * Use Case 1: Competitor Discovery (E-commerce Domain)
 * SDK setup type: full
 *
 * Given a seller's product, find the most relevant competitor product
 * to benchmark against.
 *
 * @setup-type full
 */
export async function competitorDiscovery(product: {
  title: string;
  category: string;
  price: number;
  attributes: Record<string, any>;
}) {
  // Create trace with input product metadata
  const trace = tracer.createTrace({
    metadata: {
      productTitle: product.title,
      productCategory: product.category,
      productPrice: product.price,
    },
  });

  // Store input product
  const inputProductId = trace.dataId(product, "input_product");

  try {
    // Step 1: Generate search keywords from title, category, and attributes
    const keywords = await generateKeywords(product.title, product.category);
    console.log("Generated keywords:", keywords);
    const keywordsId = trace.dataId(keywords, "keywords");
    trace.step({
      stepName: "generate_keywords",
      artifacts: [
        { dataId: inputProductId, type: "input" },
        { dataId: keywordsId, type: "output" },
      ],
      metadata: {
        keywordCount: keywords.length,
      },
    });

    // Step 2: Search and retrieve candidate competitor products
    const candidates = await searchProducts();
    console.log(`Found ${candidates.length} candidate products`);
    const candidatesId = trace.dataId(candidates, "candidates");
    trace.step({
      stepName: "search_products",
      artifacts: [
        { dataId: keywordsId, type: "input" },
        { dataId: candidatesId, type: "output" },
      ],
      metadata: {
        candidateCount: candidates.length,
      },
    });

    // Step 3: Apply filters (price range, rating threshold, review count, category match)
    const filters = {
      priceRange: { min: product.price * 0.5, max: product.price * 2 },
      minRating: 4.0,
      minReviews: 100,
      categoryMatch: product.category,
    };
    const filtered = await applyFilters(candidates, filters);
    console.log(`After filtering: ${filtered.length} products`);
    const filteredId = trace.dataId(filtered, "filtered_candidates");
    trace.step({
      stepName: "apply_filters",
      artifacts: [
        { dataId: candidatesId, type: "input" },
        { dataId: filteredId, type: "output" },
      ],
      metadata: {
        filterConfig: filters,
        inputCount: candidates.length,
        outputCount: filtered.length,
        filteredCount: filtered.length,
        filteredPercentage: (
          (filtered.length / candidates.length) *
          100
        ).toFixed(2),
      },
    });

    // Step 4: Use LLM to evaluate relevance and eliminate false positives
    const ranked = await rankByRelevance(filtered);
    console.log(`After ranking: ${ranked.length} products`);
    const rankedId = trace.dataId(ranked, "ranked_candidates");
    trace.step({
      stepName: "rank_by_relevance",
      artifacts: [
        { dataId: filteredId, type: "input" },
        { dataId: rankedId, type: "output" },
      ],
      metadata: {
        rankedCount: ranked.length,
      },
    });

    // Step 5: Select the single best competitor
    const bestMatch = ranked[0];
    console.log("Best competitor match:", bestMatch);
    const bestMatchId = trace.dataId(bestMatch, "best_match");
    trace.step({
      stepName: "select_best_competitor",
      artifacts: [
        { dataId: rankedId, type: "input" },
        { dataId: bestMatchId, type: "output" },
      ],
      metadata: {
        selectedId: bestMatch.id,
        selectedTitle: bestMatch.title,
        testObject: {
          testNestedObject: {
            name: "Ayush",
          },
        },
      },
    });

    trace.success({
      metadata: {
        selectedCompetitorId: bestMatch.id,
        finalRelevanceScore: bestMatch.relevanceScore,
      },
    });

    return bestMatch;
  } catch (error) {
    trace.error({
      error: error instanceof Error ? error : new Error(String(error)),
      metadata: { step: "competitor_discovery" },
    });
    trace.failure({
      metadata: {
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

// Mock implementations
async function generateKeywords(
  title: string,
  category: string
): Promise<string[]> {
  // Simulate LLM-based keyword generation
  const words = title.toLowerCase().split(/\s+/);
  const categoryWords = category.toLowerCase().split(/\s+/);
  return [...words, ...categoryWords].slice(0, 5);
}

async function searchProducts(): Promise<
  Array<{
    id: string;
    title: string;
    price: number;
    rating: number;
    reviewCount: number;
    category: string;
  }>
> {
  // Simulate product search API call
  return [
    {
      id: "1",
      title: "Wireless Phone Charger",
      price: 19.99,
      rating: 4.5,
      reviewCount: 1200,
      category: "Electronics",
    },
    {
      id: "2",
      title: "USB-C Charging Cable",
      price: 12.99,
      rating: 4.2,
      reviewCount: 850,
      category: "Electronics",
    },
    {
      id: "3",
      title: "Laptop Stand Adjustable",
      price: 29.99,
      rating: 4.7,
      reviewCount: 2100,
      category: "Office Supplies",
    },
    {
      id: "4",
      title: "Phone Case with Stand",
      price: 14.99,
      rating: 4.3,
      reviewCount: 950,
      category: "Electronics",
    },
    {
      id: "5",
      title: "Wireless Earbuds",
      price: 49.99,
      rating: 4.6,
      reviewCount: 1500,
      category: "Electronics",
    },
  ];
}

async function applyFilters(
  candidates: Array<{
    id: string;
    title: string;
    price: number;
    rating: number;
    reviewCount: number;
    category: string;
  }>,
  filters: {
    priceRange: { min: number; max: number };
    minRating: number;
    minReviews: number;
    categoryMatch: string;
  }
): Promise<
  Array<{
    id: string;
    title: string;
    price: number;
    rating: number;
    reviewCount: number;
    category: string;
  }>
> {
  return candidates.filter((product) => {
    return (
      product.price >= filters.priceRange.min &&
      product.price <= filters.priceRange.max &&
      product.rating >= filters.minRating &&
      product.reviewCount >= filters.minReviews &&
      product.category === filters.categoryMatch
    );
  });
}

async function rankByRelevance(
  products: Array<{
    id: string;
    title: string;
    price: number;
    rating: number;
    reviewCount: number;
    category: string;
  }>
): Promise<
  Array<{
    id: string;
    title: string;
    price: number;
    rating: number;
    reviewCount: number;
    category: string;
    relevanceScore: number;
  }>
> {
  // Simulate LLM-based relevance ranking
  return products
    .map((product) => ({
      ...product,
      relevanceScore: Math.random() * 0.3 + 0.7, // Simulated relevance score
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
