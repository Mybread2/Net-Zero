package com.inha.netzero.domain.marketplace.service;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inha.netzero.domain.marketplace.dto.MarketplaceProductListResponse;
import com.inha.netzero.domain.marketplace.dto.RecommendationResponse;
import com.inha.netzero.domain.marketplace.entity.MarketplaceCategory;
import com.inha.netzero.domain.marketplace.repository.MarketplaceProductRepository;
import com.inha.netzero.global.response.PageResponse;

@Service
@Transactional(readOnly = true)
public class MarketplaceService {

    private final MarketplaceProductRepository productRepository;

    public MarketplaceService(MarketplaceProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public PageResponse<MarketplaceProductListResponse> getProducts(MarketplaceCategory category, Pageable pageable) {
        var page = (category == null)
                ? productRepository.findAll(pageable)
                : productRepository.findByCategory(category, pageable);
        return PageResponse.of(page.map(MarketplaceProductListResponse::from));
    }

    /** Phase 4에서 LlmService 연결 전까지 빈 추천 반환(stub). */
    public RecommendationResponse getRecommendations(String query, Long currentUserId) {
        return new RecommendationResponse(List.of());
    }
}
