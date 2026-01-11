import { tracer } from "../tracer";

/**
 * Use Case 2: Product Categorization (Classification/Taxonomy Domain)
 * SDK setup type: minimal
 *
 * Given a new product, assign it to the correct category in a taxonomy
 * of 10,000+ categories.
 *
 * @setup-type minimal
 */
export async function productCategorization(product: {
  title: string;
  description: string;
  attributes?: Record<string, any>;
}) {
  // Create trace with input product metadata
  const trace = tracer.createTrace({
    metadata: {
      productTitle: product.title,
      descriptionLength: product.description.length,
    },
  });

  try {
    // Step 1: Extract product attributes from title and description
    const extractedAttributes = await extractAttributes(
      product.title,
      product.description
    );
    console.log("Extracted attributes:", extractedAttributes);
    trace.capture({
      stepName: "extract_attributes",
      artifacts: [
        { data: product, key: "input_product" },
        { data: extractedAttributes, key: "extracted_attributes" },
      ],
      metadata: {
        attributeCount: Object.keys(extractedAttributes).length,
      },
    });

    // Step 2: Match against category requirements and signals
    const candidateCategories = await matchCategories();
    console.log(`Found ${candidateCategories.length} candidate categories`);
    trace.capture({
      stepName: "match_categories",
      artifacts: [
        { data: extractedAttributes, key: "extracted_attributes" },
        { data: candidateCategories, key: "candidate_categories" },
      ],
      metadata: {
        candidateCount: candidateCategories.length,
      },
    });

    // Step 3: Handle ambiguous cases (product fits multiple categories)
    const scoredCategories = await scoreCategories(candidateCategories);
    console.log(`Scored ${scoredCategories.length} categories`);
    trace.capture({
      stepName: "score_categories",
      artifacts: [
        { data: candidateCategories, key: "candidate_categories" },
        { data: scoredCategories, key: "scored_categories" },
      ],
      metadata: {
        scoredCount: scoredCategories.length,
      },
    });

    // Step 4: Score confidence for top candidates
    const topCandidates = scoredCategories.slice(0, 5);
    const confidenceScores = await calculateConfidence(topCandidates);
    console.log("Top candidates with confidence:", confidenceScores);
    trace.capture({
      stepName: "calculate_confidence",
      artifacts: [
        { data: scoredCategories, key: "scored_categories" },
        { data: confidenceScores, key: "confidence_scores" },
      ],
      metadata: {
        topCandidateCount: topCandidates.length,
        confidenceScoresCount: confidenceScores.length,
      },
    });

    // Step 5: Select best-fit category
    const bestCategory = confidenceScores[0];
    console.log("Best category match:", bestCategory);
    trace.capture({
      stepName: "select_best_category",
      artifacts: [
        { data: confidenceScores, key: "confidence_scores" },
        { data: bestCategory, key: "best_category" },
      ],
      metadata: {
        selectedCategoryId: bestCategory.categoryId,
        selectedCategoryName: bestCategory.categoryName,
        confidence: bestCategory.confidence,
      },
    });

    trace.success({
      metadata: {
        selectedCategoryId: bestCategory.categoryId,
        selectedCategoryPath: bestCategory.path,
        finalConfidence: bestCategory.confidence,
      },
    });

    return bestCategory;
  } catch (error) {
    trace.error({
      error: error instanceof Error ? error : new Error(String(error)),
      metadata: { step: "product_categorization" },
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
async function extractAttributes(
  title: string,
  description: string
): Promise<Record<string, any>> {
  // Simulate NLP extraction
  const words = (title + " " + description).toLowerCase().split(/\s+/);
  return {
    keywords: words.filter((w) => w.length > 3).slice(0, 10),
    hasBrand: /brand|make|manufacturer/i.test(title + description),
    hasDimensions: /\d+\s*(cm|inch|mm)/i.test(title + description),
    hasColor: /(black|white|red|blue|green|yellow|gray|grey|silver|gold)/i.test(
      title + description
    ),
  };
}

async function matchCategories(): Promise<
  Array<{
    categoryId: string;
    categoryName: string;
    path: string[];
    matchScore: number;
  }>
> {
  // Simulate category matching against taxonomy
  const allCategories = [
    {
      categoryId: "cat-001",
      categoryName: "Electronics",
      path: ["Electronics"],
      matchScore: 0.95,
    },
    {
      categoryId: "cat-002",
      categoryName: "Smartphones",
      path: ["Electronics", "Smartphones"],
      matchScore: 0.88,
    },
    {
      categoryId: "cat-003",
      categoryName: "Phone Accessories",
      path: ["Electronics", "Phone Accessories"],
      matchScore: 0.82,
    },
    {
      categoryId: "cat-004",
      categoryName: "Computers",
      path: ["Electronics", "Computers"],
      matchScore: 0.65,
    },
    {
      categoryId: "cat-005",
      categoryName: "Office Supplies",
      path: ["Office Supplies"],
      matchScore: 0.45,
    },
  ];

  return allCategories
    .filter((cat) => cat.matchScore > 0.4)
    .sort((a, b) => b.matchScore - a.matchScore);
}

async function scoreCategories(
  categories: Array<{
    categoryId: string;
    categoryName: string;
    path: string[];
    matchScore: number;
  }>
): Promise<
  Array<{
    categoryId: string;
    categoryName: string;
    path: string[];
    matchScore: number;
    finalScore: number;
  }>
> {
  // Simulate category scoring logic
  return categories
    .map((cat) => ({
      ...cat,
      finalScore: cat.matchScore * (0.8 + Math.random() * 0.2), // Add some variation
    }))
    .sort((a, b) => b.finalScore - a.finalScore);
}

async function calculateConfidence(
  candidates: Array<{
    categoryId: string;
    categoryName: string;
    path: string[];
    matchScore: number;
    finalScore: number;
  }>
): Promise<
  Array<{
    categoryId: string;
    categoryName: string;
    path: string[];
    matchScore: number;
    finalScore: number;
    confidence: number;
  }>
> {
  // Simulate confidence calculation (LLM-based evaluation)
  return candidates
    .map((cat) => ({
      ...cat,
      confidence: cat.finalScore * (0.85 + Math.random() * 0.15), // Confidence based on score with noise
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
