package com.inha.netzero.domain.user.dto;

import com.inha.netzero.domain.user.entity.DogTemperament;
import com.inha.netzero.domain.user.entity.Gender;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 온보딩/수정 시 강아지 입력(2.2). hasDog=true 일 때만 사용한다.
 * name/gender/breed/temperament 필수, age 선택.
 */
public record DogRequest(
        @NotBlank String name,
        @NotNull Gender gender,
        @NotBlank String breed,
        @Min(0) Integer age,
        @NotNull DogTemperament temperament) {
}
