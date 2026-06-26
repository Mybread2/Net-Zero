package com.inha.netzero.ai.prompt;

import java.util.List;

import com.inha.netzero.ai.dto.DogProfile;
import com.inha.netzero.ai.dto.ProductCatalogItem;

/**
 * LLM 프롬프트 템플릿 모음.
 */
public final class PromptTemplates {

        private PromptTemplates() {
        }

        // ── LLM-1: 판매글 자동작성 ──────────────────────────────────────────────

        public static final String SELL_DRAFT_SYSTEM = """
                        너는 중고거래 판매글 작성 도우미다.
                        입력 이미지를 보고 한국어로 매력적이고 정직한 판매글 초안을 만든다.
                        과장·허위 정보는 절대 쓰지 않는다.
                        반드시 아래 JSON 스키마로만 응답하고, 다른 텍스트는 출력하지 않는다:
                        {"title":"string","description":"string","suggestedCategory":"FOOD|TOY|DAILY|CLOTHING|ETC"}
                        """;

        public static String sellDraftUser(List<String> keywords) {
                String kw = (keywords == null || keywords.isEmpty()) ? "없음" : String.join(", ", keywords);
                return """
                                키워드: %s
                                위 이미지의 상품에 대한 판매글 초안을 JSON으로만 작성하라.
                                suggestedCategory는 FOOD, TOY, DAILY, CLOTHING, ETC 중 하나여야 한다.
                                """.formatted(kw);
        }

        // ── LLM-2(a): 저탄소 한 줄 요약 ────────────────────────────────────────

        public static String lowCarbonSummaryUser(String company, String title, String category) {
                return """
                                다음 상품이 왜 저탄소·친환경인지 보호자가 이해하기 쉽게 한 문장(50자 이내)으로 설명하라.
                                과장 금지. 문장만 출력하라.
                                회사: %s, 상품명: %s, 카테고리: %s
                                """.formatted(company, title, category);
        }

        public static final String LOW_CARBON_SUMMARY_SYSTEM = "너는 친환경 상품 설명 전문가다. 요청한 형식 그대로만 답한다.";

        // ── LLM-2(b): 저탄소 상품 추천 ─────────────────────────────────────────

        public static final String RECOMMENDATION_SYSTEM = """
                        너는 반려견 저탄소 용품 추천 도우미다.
                        반드시 주어진 카탈로그 안에 존재하는 상품만 추천하고, 카탈로그에 없는 productId는 절대 만들지 마라.
                        추천은 3~5개로 제한한다.
                        반드시 아래 JSON 스키마로만 응답하고 다른 텍스트는 출력하지 않는다:
                        {"recommendations":[{"productId":number,"reason":"string"}]}
                        """;

        public static String recommendationUser(String query, DogProfile dog, List<ProductCatalogItem> catalog) {
                String dogInfo = (dog == null)
                                ? "강아지 정보 없음"
                                : "이름:%s 품종:%s 나이:%s 성향:%s".formatted(
                                                dog.getName(), dog.getBreed(),
                                                dog.getAge() != null ? dog.getAge() + "살" : "미상",
                                                dog.getTemperament());

                var sb = new StringBuilder();
                sb.append("강아지 프로필: ").append(dogInfo).append("\n");
                sb.append("사용자 질의: ").append(query).append("\n\n");
                sb.append("카탈로그(id|회사|상품명|카테고리|가격|저탄소요약):\n");
                for (ProductCatalogItem item : catalog) {
                        sb.append(item.getId()).append("|")
                                        .append(item.getCompany()).append("|")
                                        .append(item.getTitle()).append("|")
                                        .append(item.getCategory()).append("|")
                                        .append(item.getPrice()).append("원|")
                                        .append(item.getLowCarbonSummary() != null ? item.getLowCarbonSummary() : "-")
                                        .append("\n");
                }
                sb.append("\n위 카탈로그에서만 추천하고 JSON으로 응답하라.");
                return sb.toString();
        }
}
