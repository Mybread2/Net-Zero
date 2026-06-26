package com.inha.netzero.domain.walk.dto;

import com.inha.netzero.domain.user.entity.DogTemperament;
import com.inha.netzero.domain.user.entity.Gender;

/**
 * 4.7 친구 상세의 강아지 요약(공개 프로필용). users/me §2.1 강아지 필드셋과 동일.
 */
public record FriendDogResponse(

        Long id,
        String name,
        Gender gender,
        String breed,
        Integer age,
        DogTemperament temperament,
        String imageUrl
) {
}
