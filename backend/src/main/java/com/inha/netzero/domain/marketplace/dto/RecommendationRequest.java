package com.inha.netzero.domain.marketplace.dto;

import jakarta.validation.constraints.NotBlank;

public class RecommendationRequest {

    @NotBlank
    private String query;

    public String getQuery() { return query; }
}
