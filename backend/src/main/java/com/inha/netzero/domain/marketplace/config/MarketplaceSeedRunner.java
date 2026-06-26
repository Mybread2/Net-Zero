package com.inha.netzero.domain.marketplace.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.inha.netzero.domain.marketplace.entity.MarketplaceCategory;
import com.inha.netzero.domain.marketplace.entity.MarketplaceProduct;
import com.inha.netzero.domain.marketplace.repository.MarketplaceProductRepository;

@Component
public class MarketplaceSeedRunner implements ApplicationRunner {

    private final MarketplaceProductRepository productRepository;

    public MarketplaceSeedRunner(MarketplaceProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (productRepository.count() > 0) {
            return;
        }

        productRepository.save(product("그린펫", "저탄소 사료 2kg", null, MarketplaceCategory.FOOD, 4.5, 120, 29000,
                "식물성 단백질 비중을 높여 탄소발자국을 30% 줄였습니다."));
        productRepository.save(product("에코독", "대나무 식기 세트", null, MarketplaceCategory.DAILY, 4.2, 85, 15000,
                "생분해성 대나무 소재로 플라스틱 사용을 제로화했습니다."));
        productRepository.save(product("바이오펫", "유기농 간식 300g", null, MarketplaceCategory.FOOD, 4.7, 200, 12000,
                "유기농 인증 원료만 사용하여 농약·화학비료 탄소를 줄였습니다."));
        productRepository.save(product("그린독", "재활용 원단 하네스", null, MarketplaceCategory.DAILY, 4.0, 60, 22000,
                "폐페트병 재활용 원단으로 제작해 자원 순환에 기여합니다."));
        productRepository.save(product("에코퍼피", "천연 고무 장난감", null, MarketplaceCategory.DAILY, 4.3, 150, 8000,
                "천연 고무만 사용하여 석유 화학 소재를 완전히 대체했습니다."));
        productRepository.save(product("클린펫", "식물성 샴푸 500ml", null, MarketplaceCategory.DAILY, 4.1, 90, 18000,
                "식물 유래 계면활성제로 수질 오염을 최소화합니다."));
        productRepository.save(product("내추럴보울", "코코넛 껍질 급수기", null, MarketplaceCategory.DAILY, 3.9, 40, 11000,
                "코코넛 껍질을 업사이클링하여 폐기물을 자원으로 전환합니다."));
        productRepository.save(product("그린밀", "곤충 단백질 사료 1kg", null, MarketplaceCategory.FOOD, 4.4, 95, 25000,
                "곤충 사육은 가축 대비 온실가스 배출이 90% 적습니다."));
    }

    private MarketplaceProduct product(String company, String title, String imageUrl,
                                       MarketplaceCategory category, double rating, int ratingCount,
                                       int price, String lowCarbonSummary) {
        MarketplaceProduct p = new MarketplaceProduct(company, title, imageUrl, category, rating, ratingCount, price);
        p.cacheLowCarbonSummary(lowCarbonSummary);
        return p;
    }
}
