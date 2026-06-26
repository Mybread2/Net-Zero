package com.inha.netzero.domain.market.controller;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.inha.netzero.ai.dto.SellDraftResult;
import com.inha.netzero.ai.service.LlmService;
import com.inha.netzero.domain.market.dto.HeartToggleResponse;
import com.inha.netzero.domain.market.dto.MarketItemCreateRequest;
import com.inha.netzero.domain.market.dto.MarketItemDetailResponse;
import com.inha.netzero.domain.market.dto.MarketItemListResponse;
import com.inha.netzero.domain.market.dto.SellDraftResponse;
import com.inha.netzero.domain.market.entity.MarketCategory;
import com.inha.netzero.domain.market.entity.MarketItemStatus;
import com.inha.netzero.domain.market.entity.TradeType;
import com.inha.netzero.domain.market.service.MarketService;
import com.inha.netzero.global.response.ApiResponse;
import com.inha.netzero.global.response.PageResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/market")
public class MarketController {

    private final MarketService marketService;
    private final LlmService llmService;

    public MarketController(MarketService marketService, LlmService llmService) {
        this.marketService = marketService;
        this.llmService = llmService;
    }

    @GetMapping("/items")
    public ApiResponse<PageResponse<MarketItemListResponse>> getItems(
            @RequestParam(required = false) TradeType tradeType,
            @RequestParam(required = false) MarketCategory category,
            @RequestParam(required = false) MarketItemStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(marketService.getItems(tradeType, category, status, pageable));
    }

    @GetMapping("/items/{id}")
    public ApiResponse<MarketItemDetailResponse> getItemDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal Long userId) {
        return ApiResponse.success(marketService.getItemDetail(id, userId));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<Map<String, Long>>> createItem(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody MarketItemCreateRequest request) {
        Long itemId = marketService.createItem(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(Map.of("itemId", itemId)));
    }

    @PostMapping("/items/{id}/heart")
    public ApiResponse<HeartToggleResponse> toggleHeart(
            @PathVariable Long id,
            @AuthenticationPrincipal Long userId) {
        return ApiResponse.success(marketService.toggleHeart(id, userId));
    }

    /** LLM-1: 판매글 자동작성 초안. LLM 실패 시 빈 초안 반환(글쓰기 비차단). */
    @PostMapping("/items/draft")
    public ApiResponse<SellDraftResponse> createDraft(
            @AuthenticationPrincipal Long userId,
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "keywords", required = false) String keywords) throws IOException {
        byte[] imageBytes = image.getBytes();
        String format = resolveImageFormat(image.getContentType());
        List<String> keywordList = (keywords != null && !keywords.isBlank())
                ? Arrays.asList(keywords.split(","))
                : List.of();

        SellDraftResult result = llmService.generateSellDraft(imageBytes, format, keywordList);
        return ApiResponse.success(SellDraftResponse.from(result));
    }

    private String resolveImageFormat(String contentType) {
        if (contentType == null) return "jpeg";
        if (contentType.contains("png")) return "png";
        if (contentType.contains("gif")) return "gif";
        if (contentType.contains("webp")) return "webp";
        return "jpeg";
    }
}
