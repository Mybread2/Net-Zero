package com.inha.netzero.domain.user.dto;

import com.inha.netzero.domain.user.entity.Gender;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 온보딩/프로필 수정 요청(2.2). nickname/gender/hasDog 필수.
 * hasDog=true 이면 dog 필수(@AssertTrue 로 검증), hasDog=false 이면 dog 는 무시된다.
 */
public record UserUpdateRequest(
        @NotBlank String nickname,
        @NotNull Gender gender,
        @NotNull Boolean hasDog,
        @Valid DogRequest dog) {

    /** hasDog=true 인데 dog 가 없으면 검증 실패(VALIDATION_ERROR). */
    @AssertTrue(message = "강아지를 동반하면(hasDog=true) 강아지 정보(dog)가 필요합니다.")
    public boolean isDogPresentWhenHasDog() {
        return !Boolean.TRUE.equals(hasDog) || dog != null;
    }
}
