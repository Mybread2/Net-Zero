package com.inha.netzero.domain.marketplace.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.inha.netzero.domain.marketplace.entity.MarketplaceCategory;
import com.inha.netzero.domain.marketplace.entity.MarketplaceProduct;

public interface MarketplaceProductRepository extends JpaRepository<MarketplaceProduct, Long> {

    Page<MarketplaceProduct> findByCategory(MarketplaceCategory category, Pageable pageable);

    List<MarketplaceProduct> findByLowCarbonSummaryIsNull();
}
