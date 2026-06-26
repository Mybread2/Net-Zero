package com.inha.netzero.domain.marketplace.dto;

import java.util.List;

public class RecommendationResponse {

    private final List<RecommendationItem> recommendations;

    public RecommendationResponse(List<RecommendationItem> recommendations) {
        this.recommendations = recommendations;
    }

    public List<RecommendationItem> getRecommendations() { return recommendations; }

    public static class RecommendationItem {
        private final Long productId;
        private final String title;
        private final String reason;

        public RecommendationItem(Long productId, String title, String reason) {
            this.productId = productId;
            this.title = title;
            this.reason = reason;
        }

        public Long getProductId() { return productId; }
        public String getTitle() { return title; }
        public String getReason() { return reason; }
    }
}
