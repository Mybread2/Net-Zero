package com.inha.netzero.domain.user.service;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inha.netzero.domain.user.dto.DogRequest;
import com.inha.netzero.domain.user.dto.GhostModeRequest;
import com.inha.netzero.domain.user.dto.GhostModeResponse;
import com.inha.netzero.domain.user.dto.LocationResponse;
import com.inha.netzero.domain.user.dto.LocationUpdateRequest;
import com.inha.netzero.domain.user.dto.UserMeResponse;
import com.inha.netzero.domain.user.dto.UserProfileResponse;
import com.inha.netzero.domain.user.dto.UserUpdateRequest;
import com.inha.netzero.domain.user.entity.AuthProvider;
import com.inha.netzero.domain.user.entity.Dog;
import com.inha.netzero.domain.user.entity.User;
import com.inha.netzero.domain.user.repository.UserRepository;
import com.inha.netzero.global.exception.BusinessException;
import com.inha.netzero.global.exception.ErrorCode;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Google 로그인 시 이메일로 사용자를 찾고 없으면 생성한다.
     * 프로필 이미지는 Google 값으로 최신화한다(닉네임 등 온보딩 정보는 건드리지 않음).
     */
    @Transactional
    public User findOrCreateGoogleUser(String email, String providerId, String profileImageUrl) {
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> new User(email, AuthProvider.GOOGLE, providerId));
        if (profileImageUrl != null) {
            user.changeProfileImage(profileImageUrl);
        }
        return userRepository.save(user);
    }

    /** 2.1 본인 전체 정보(사용자 + 강아지). */
    @Transactional(readOnly = true)
    public UserMeResponse getMe(Long userId) {
        return UserMeResponse.from(getUserOrThrow(userId));
    }

    /**
     * 2.2 온보딩/프로필 수정. hasDog=true 이면 강아지를 교체(clear 후 새로 추가),
     * hasDog=false 이면 강아지를 비운다. 생성된 강아지 id 를 응답에 담기 위해 flush 한다.
     */
    @Transactional
    public UserMeResponse updateProfile(Long userId, UserUpdateRequest request) {
        User user = getUserOrThrow(userId);
        boolean hasDog = Boolean.TRUE.equals(request.hasDog());
        user.updateProfile(request.nickname(), request.gender(), hasDog);
        user.clearDogs();
        if (hasDog) {
            DogRequest dog = request.dog();
            user.addDog(new Dog(dog.name(), dog.gender(), dog.breed(), dog.age(), dog.temperament(), null));
        }
        userRepository.flush();
        return UserMeResponse.from(user);
    }

    /** 2.3 위치 갱신. 좌표 저장과 함께 lastActiveAt 을 현재시각으로 갱신. */
    @Transactional
    public LocationResponse updateLocation(Long userId, LocationUpdateRequest request) {
        User user = getUserOrThrow(userId);
        user.updateLocation(request.lat(), request.lng(), Instant.now());
        return new LocationResponse(user.getLat(), user.getLng(), user.getLastActiveAt());
    }

    /** 2.4 고스트모드 토글. */
    @Transactional
    public GhostModeResponse updateGhostMode(Long userId, GhostModeRequest request) {
        User user = getUserOrThrow(userId);
        user.setGhostMode(request.enabled());
        return new GhostModeResponse(user.isGhostMode());
    }

    /** 2.5 공개 프로필. 고스트모드여도 프로필 자체는 노출하되 위치는 포함하지 않는다. */
    @Transactional(readOnly = true)
    public UserProfileResponse getPublicProfile(Long targetUserId) {
        return UserProfileResponse.from(getUserOrThrow(targetUserId));
    }

    private User getUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
