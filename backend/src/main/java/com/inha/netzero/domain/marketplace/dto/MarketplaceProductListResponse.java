package com.inha.netzero.domain.marketplace.dto;

import com.inha.netzero.domain.marketplace.entity.MarketplaceProduct;

public class MarketplaceProductListResponse {

    private final Long productId;
    private final String company;
    private final String title;
    private final String imageUrl;
    private final double rating;
    private final int ratingCount;
    private final int price;
    private final String lowCarbonSummary;

    private MarketplaceProductListResponse(MarketplaceProduct p) {
        this.productId = p.getId();
        this.company = p.getCompany();
        this.title = p.getTitle();
        this.imageUrl = p.getImageUrl();
        this.rating = p.getRating();
        this.ratingCount = p.getRatingCount();
        this.price = p.getPrice();
        this.lowCarbonSummary = p.getLowCarbonSummary();
    }

    public static MarketplaceProductListResponse from(MarketplaceProduct p) {
        return new MarketplaceProductListResponse(p);
    }

    public Long getProductId() { return productId; }
    public String getCompany() { return company; }
    public String getTitle() { return title; }
    public String getImageUrl() { return imageUrl; }
    public double getRating() { return rating; }
    public int getRatingCount() { return ratingCount; }
    public int getPrice() { return price; }
    public String getLowCarbonSummary() { return lowCarbonSummary; }
}
