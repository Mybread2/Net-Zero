package com.inha.netzero.domain.walk.dto;

import java.time.Instant;

/**
 * 4.4 보낸 / 4.5 받은 요청 목록 항목. { requestId, user, createdAt }.
 * sent → user = addressee, received → user = requester.
 */
public record FriendRequestItemResponse(

        Long requestId,
        FriendUserResponse user,
        Instant createdAt
) {
}
