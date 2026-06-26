package com.inha.netzero.ai.dto;

public class SellDraftResult {

    private final String title;
    private final String description;
    private final String suggestedCategory;

    public SellDraftResult(String title, String description, String suggestedCategory) {
        this.title = title;
        this.description = description;
        this.suggestedCategory = suggestedCategory;
    }

    public static SellDraftResult empty() {
        return new SellDraftResult("", "", "ETC");
    }

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getSuggestedCategory() { return suggestedCategory; }
}
