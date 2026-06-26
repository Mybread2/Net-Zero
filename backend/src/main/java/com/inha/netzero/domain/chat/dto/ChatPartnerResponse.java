package com.inha.netzero.domain.chat.dto;

/**
 * 대화방 목록(5.1)에서 상대방 요약 정보.
 * profileImageUrl 은 사용자 이미지가 없으면 첫 강아지 이미지로 폴백한다.
 */
public record ChatPartnerResponse(Long userId, String nickname, String profileImageUrl) {
}
