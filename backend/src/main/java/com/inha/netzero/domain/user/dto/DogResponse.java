package com.inha.netzero.domain.user.dto;

import com.inha.netzero.domain.user.entity.Dog;
import com.inha.netzero.domain.user.entity.DogTemperament;
import com.inha.netzero.domain.user.entity.Gender;

/**
 * 강아지 응답. 본인 정보(2.1)·공개 프로필(2.5)에서 공용으로 쓰인다.
 */
public record DogResponse(
        Long id,
        String name,
        Gender gender,
        String breed,
        Integer age,
        DogTemperament temperament,
        String imageUrl) {

    public static DogResponse from(Dog dog) {
        return new DogResponse(
                dog.getId(),
                dog.getName(),
                dog.getGender(),
                dog.getBreed(),
                dog.getAge(),
                dog.getTemperament(),
                dog.getImageUrl());
    }
}
