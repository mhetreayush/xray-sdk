import express from "express";
import cors from "cors";
import { competitorDiscovery } from "./use-cases/competitor-discovery";
import { productCategorization } from "./use-cases/product-categorization";

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Use case execution endpoint
app.post("/api/v1/use-cases/execute", async (req, res) => {
  try {
    const { useCase, input } = req.body;

    if (!useCase) {
      return res.status(400).json({ error: "useCase is required" });
    }

    let result;
    if (useCase === "competitor-discovery") {
      if (
        !input ||
        !input.title ||
        !input.category ||
        input.price === undefined
      ) {
        return res.status(400).json({
          error:
            "Invalid input for competitor-discovery. Required: title, category, price, attributes",
        });
      }
      result = await competitorDiscovery({
        title: input.title,
        category: input.category,
        price: input.price,
        attributes: input.attributes || {},
      });
    } else if (useCase === "product-categorization") {
      if (!input || !input.title || !input.description) {
        return res.status(400).json({
          error:
            "Invalid input for product-categorization. Required: title, description, attributes (optional)",
        });
      }
      result = await productCategorization({
        title: input.title,
        description: input.description,
        attributes: input.attributes || {},
      });
    } else {
      return res.status(400).json({
        error: `Unknown use case: ${useCase}. Supported: competitor-discovery, product-categorization`,
      });
    }

    res.json({
      success: true,
      useCase,
      result,
    });
  } catch (error) {
    console.error("Error executing use case:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// List available use cases
app.get("/api/v1/use-cases", (req, res) => {
  res.json({
    useCases: [
      {
        id: "competitor-discovery",
        name: "Competitor Discovery",
        description:
          "Find the most relevant competitor product to benchmark against",
        requiredInput: {
          title: "string",
          category: "string",
          price: "number",
          attributes: "object (optional)",
        },
      },
      {
        id: "product-categorization",
        name: "Product Categorization",
        description: "Assign a product to the correct category in a taxonomy",
        requiredInput: {
          title: "string",
          description: "string",
          attributes: "object (optional)",
        },
      },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Example app server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Use cases API: http://localhost:${PORT}/api/v1/use-cases`);
});
