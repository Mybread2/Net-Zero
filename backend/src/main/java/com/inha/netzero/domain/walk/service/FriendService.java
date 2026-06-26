package com.inha.netzero.domain.walk.service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inha.netzero.domain.user.entity.Dog;
import com.inha.netzero.domain.user.entity.User;
import com.inha.netzero.domain.user.repository.UserRepository;
import com.inha.netzero.domain.walk.dto.FriendDogResponse;
import com.inha.netzero.domain.walk.dto.FriendProfileResponse;
import com.inha.netzero.domain.walk.dto.FriendRequestItemResponse;
import com.inha.netzero.domain.walk.dto.FriendRequestResponse;
import com.inha.netzero.domain.walk.dto.FriendResponse;
import com.inha.netzero.domain.walk.dto.FriendUserResponse;
import com.inha.netzero.domain.walk.entity.FriendRequest;
import com.inha.netzero.domain.walk.entity.FriendRequestStatus;
import com.inha.netzero.domain.walk.repository.FriendRequestRepository;
import com.inha.netzero.global.exception.BusinessException;
import com.inha.netzero.global.exception.ErrorCode;

/**
 * 친구 도메인 비즈니스 로직. 요청 생성/응답, 보낸·받은 목록, 친구 목록·상세를 다룬다.
 * 상대 User 는 항상 UserRepository 로 로드한다(엔티티 직접 노출 금지, DTO 변환).
 */
@Service
public class FriendService {

    /** 4.1 중복 판단 기준: 이미 친구이거나 대기 중인 요청이 있으면 재요청 불가. */
    private static final List<FriendRequestStatus> ACTIVE_STATUSES =
            List.of(FriendRequestStatus.PENDING, FriendRequestStatus.ACCEPTED);

    /** online 판정 임계값(초). lastActiveAt 이 최근 5분 이내면 online. */
    private static final long ONLINE_THRESHOLD_SECONDS = 300;

    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;

    public FriendService(FriendRequestRepository friendRequestRepository, UserRepository userRepository) {
        this.friendRequestRepository = friendRequestRepository;
        this.userRepository = userRepository;
    }

    /** 4.1 친구 요청 보내기. */
    @Transactional
    public FriendRequestResponse sendRequest(Long requesterId, Long addresseeId) {
        if (addresseeId.equals(requesterId)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "본인에게는 친구 요청을 보낼 수 없습니다.");
        }
        User addressee = userRepository.findById(addresseeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "상대를 찾을 수 없습니다."));
        if (friendRequestRepository.existsBetweenWithStatus(requesterId, addresseeId, ACTIVE_STATUSES)) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 친구이거나 대기 중인 요청이 있습니다.");
        }
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));

        FriendRequest saved = friendRequestRepository.save(new FriendRequest(requester, addressee));
        return new FriendRequestResponse(saved.getId(), saved.getStatus());
    }

    /** 4.2 수락 / 4.3 거절. addressee 본인만 가능. */
    @Transactional
    public FriendRequestResponse respond(Long currentUserId, Long requestId, boolean accept) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!request.getAddressee().getId().equals(currentUserId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (accept) {
            request.accept();
        } else {
            request.reject();
        }
        return new FriendRequestResponse(request.getId(), request.getStatus());
    }

    /** 4.4 보낸 요청(PENDING). 항목의 user = addressee. */
    @Transactional(readOnly = true)
    public List<FriendRequestItemResponse> getSentRequests(Long userId) {
        List<FriendRequest> requests = friendRequestRepository
                .findByRequesterIdAndStatusOrderByCreatedAtDesc(userId, FriendRequestStatus.PENDING);
        return toItems(requests, true);
    }

    /** 4.5 받은 요청(PENDING). 항목의 user = requester. */
    @Transactional(readOnly = true)
    public List<FriendRequestItemResponse> getReceivedRequests(Long userId) {
        List<FriendRequest> requests = friendRequestRepository
                .findByAddresseeIdAndStatusOrderByCreatedAtDesc(userId, FriendRequestStatus.PENDING);
        return toItems(requests, false);
    }

    /** 4.6 친구 목록. online(true) 먼저, 그다음 닉네임·최근접속 순. */
    @Transactional(readOnly = true)
    public List<FriendResponse> getFriends(Long userId) {
        List<Long> counterpartIds = friendRequestRepository
                .findCounterpartIdsByStatus(userId, FriendRequestStatus.ACCEPTED);
        if (counterpartIds.isEmpty()) {
            return List.of();
        }
        return userRepository.findAllById(counterpartIds).stream()
                .sorted(Comparator
                        .comparing(this::isOnline, Comparator.reverseOrder())
                        .thenComparing(u -> u.getNickname() == null ? "" : u.getNickname())
                        .thenComparing(User::getLastActiveAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(u -> new FriendResponse(u.getId(), u.getNickname(), resolveProfileImageUrl(u), isOnline(u)))
                .toList();
    }

    /** 4.7 친구 상세. 친구 관계(ACCEPTED)인 경우만 공개 프로필 + online 반환. */
    @Transactional(readOnly = true)
    public FriendProfileResponse getFriendProfile(Long currentUserId, Long targetUserId) {
        boolean friend = friendRequestRepository.existsBetweenWithStatus(
                currentUserId, targetUserId, List.of(FriendRequestStatus.ACCEPTED));
        if (!friend) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        List<FriendDogResponse> dogs = target.getDogs().stream()
                .map(d -> new FriendDogResponse(d.getId(), d.getName(), d.getGender(),
                        d.getBreed(), d.getAge(), d.getTemperament(), d.getImageUrl()))
                .toList();
        return new FriendProfileResponse(target.getId(), target.getNickname(),
                resolveProfileImageUrl(target), isOnline(target), dogs);
    }

    /**
     * 요청 목록 → DTO 변환. 상대 User 는 UserRepository 로 한 번에 로드한다.
     * @param sent true=보낸(상대=addressee), false=받은(상대=requester)
     */
    private List<FriendRequestItemResponse> toItems(List<FriendRequest> requests, boolean sent) {
        List<Long> counterpartIds = requests.stream()
                .map(fr -> counterpartId(fr, sent))
                .toList();
        Map<Long, User> users = userRepository.findAllById(counterpartIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return requests.stream()
                .map(fr -> {
                    User other = users.get(counterpartId(fr, sent));
                    FriendUserResponse user = new FriendUserResponse(
                            other.getId(), other.getNickname(), resolveProfileImageUrl(other));
                    return new FriendRequestItemResponse(fr.getId(), user, fr.getCreatedAt());
                })
                .toList();
    }

    private Long counterpartId(FriendRequest request, boolean sent) {
        return (sent ? request.getAddressee() : request.getRequester()).getId();
    }

    private boolean isOnline(User user) {
        Instant lastActiveAt = user.getLastActiveAt();
        return lastActiveAt != null
                && lastActiveAt.isAfter(Instant.now().minusSeconds(ONLINE_THRESHOLD_SECONDS));
    }

    /** profileImageUrl 폴백: 사용자 이미지 우선, 없으면 첫 강아지 이미지. */
    private String resolveProfileImageUrl(User user) {
        String url = user.getProfileImageUrl();
        if (url != null && !url.isBlank()) {
            return url;
        }
        List<Dog> dogs = user.getDogs();
        if (dogs != null && !dogs.isEmpty()) {
            return dogs.get(0).getImageUrl();
        }
        return null;
    }
}
