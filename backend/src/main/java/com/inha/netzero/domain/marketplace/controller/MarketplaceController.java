package com.inha.netzero.domain.marketplace.controller;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.inha.netzero.domain.marketplace.dto.MarketplaceProductListResponse;
import com.inha.netzero.domain.marketplace.dto.RecommendationRequest;
import com.inha.netzero.domain.marketplace.dto.RecommendationResponse;
import com.inha.netzero.domain.marketplace.entity.MarketplaceCategory;
import com.inha.netzero.domain.marketplace.service.MarketplaceService;
import com.inha.netzero.global.response.ApiResponse;
import com.inha.netzero.global.response.PageResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/marketplace")
public class MarketplaceController {

    private final MarketplaceService marketplaceService;

    public MarketplaceController(MarketplaceService marketplaceService) {
        this.marketplaceService = marketplaceService;
    }

    @GetMapping("/products")
    public ApiResponse<PageResponse<MarketplaceProductListResponse>> getProducts(
            @RequestParam(required = false) MarketplaceCategory category,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(marketplaceService.getProducts(category, pageable));
    }

    @PostMapping("/recommendations")
    public ApiResponse<RecommendationResponse> getRecommendations(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody RecommendationRequest request) {
        return ApiResponse.success(marketplaceService.getRecommendations(request.getQuery(), userId));
    }
}
