package com.inha.netzero.domain.market.dto;

import com.inha.netzero.ai.dto.SellDraftResult;

public class SellDraftResponse {

    private final String title;
    private final String description;
    private final String suggestedCategory;

    private SellDraftResponse(SellDraftResult result) {
        this.title = result.getTitle();
        this.description = result.getDescription();
        this.suggestedCategory = result.getSuggestedCategory();
    }

    public static SellDraftResponse from(SellDraftResult result) {
        return new SellDraftResponse(result);
    }

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getSuggestedCategory() { return suggestedCategory; }
}
