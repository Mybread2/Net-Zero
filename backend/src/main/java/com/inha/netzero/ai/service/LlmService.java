package com.inha.netzero.ai.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inha.netzero.ai.client.BedrockClient;
import com.inha.netzero.ai.dto.DogProfile;
import com.inha.netzero.ai.dto.ProductCatalogItem;
import com.inha.netzero.ai.dto.RecommendationResult;
import com.inha.netzero.ai.dto.SellDraftResult;
import com.inha.netzero.ai.prompt.PromptTemplates;
import com.inha.netzero.domain.market.entity.MarketCategory;

/**
 * LLM 기능 서비스. 모든 Bedrock 호출은 여기서 처리하며, 실패 시 빈 결과로 폴백한다.
 */
@Service
public class LlmService {

    private static final Logger log = LoggerFactory.getLogger(LlmService.class);

    private final BedrockClient bedrockClient;
    // ObjectMapper는 스레드 안전하므로 직접 생성해 사용 (Spring Boot 4에서 빈 패키지 변경).
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LlmService(BedrockClient bedrockClient) {
        this.bedrockClient = bedrockClient;
    }

    /**
     * LLM-1: 판매글 자동작성 초안.
     * 실패 시 빈 초안 반환(글쓰기 비차단).
     */
    public SellDraftResult generateSellDraft(byte[] imageBytes, String imageFormat, List<String> keywords) {
        try {
            String raw = bedrockClient.converseWithImage(
                    PromptTemplates.SELL_DRAFT_SYSTEM,
                    PromptTemplates.sellDraftUser(keywords),
                    imageBytes, imageFormat);
            if (raw == null) return SellDraftResult.empty();

            JsonNode node = parseJson(raw);
            if (node == null) return SellDraftResult.empty();

            String category = normalizeCategory(node.path("suggestedCategory").asText("ETC"));

            return new SellDraftResult(
                    node.path("title").asText(""),
                    node.path("description").asText(""),
                    category);
        } catch (Exception e) {
            log.warn("generateSellDraft failed: {}", e.getMessage());
            return SellDraftResult.empty();
        }
    }

    /**
     * LLM-2(a): 저탄소 한 줄 요약 생성.
     * 실패 시 null 반환(DB에 null 유지, 추후 재생성).
     */
    public String generateLowCarbonSummary(String company, String title, String category) {
        try {
            String result = bedrockClient.converseText(
                    PromptTemplates.LOW_CARBON_SUMMARY_SYSTEM,
                    PromptTemplates.lowCarbonSummaryUser(company, title, category));
            return result != null ? result.strip() : null;
        } catch (Exception e) {
            log.warn("generateLowCarbonSummary failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * LLM-2(b): 저탄소 상품 추천.
     * 실패 시 빈 추천 반환(비차단).
     */
    public RecommendationResult recommendProducts(String query, DogProfile dogProfile,
                                                   List<ProductCatalogItem> catalog) {
        try {
            String raw = bedrockClient.converseText(
                    PromptTemplates.RECOMMENDATION_SYSTEM,
                    PromptTemplates.recommendationUser(query, dogProfile, catalog));
            if (raw == null) return RecommendationResult.empty();

            JsonNode node = parseJson(raw);
            if (node == null) return RecommendationResult.empty();

            Set<Long> validIds = catalog.stream()
                    .map(ProductCatalogItem::getId)
                    .collect(Collectors.toSet());

            List<RecommendationResult.Item> items = new ArrayList<>();
            if (node.has("recommendations")) {
                for (JsonNode rec : node.get("recommendations")) {
                    long pid = rec.path("productId").asLong(-1);
                    if (pid > 0 && validIds.contains(pid)) {
                        items.add(new RecommendationResult.Item(pid, rec.path("reason").asText("")));
                    }
                }
            }
            return new RecommendationResult(items);
        } catch (Exception e) {
            log.warn("recommendProducts failed: {}", e.getMessage());
            return RecommendationResult.empty();
        }
    }

    /** 코드블록 제거 후 첫 {...} 추출해 JSON 파싱. 실패 시 null. */
    private JsonNode parseJson(String raw) {
        String text = raw.replaceAll("(?s)```[a-z]*\\n?", "").replaceAll("```", "").strip();
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end < 0 || start > end) return null;
        try {
            return objectMapper.readTree(text.substring(start, end + 1));
        } catch (JsonProcessingException e) {
            log.warn("JSON parse failed: {}", e.getMessage());
            return null;
        }
    }

    /** suggestedCategory를 MarketCategory enum으로 정규화. 미일치 시 ETC. */
    private String normalizeCategory(String raw) {
        try {
            MarketCategory.valueOf(raw.toUpperCase());
            return raw.toUpperCase();
        } catch (IllegalArgumentException e) {
            return "ETC";
        }
    }
}
