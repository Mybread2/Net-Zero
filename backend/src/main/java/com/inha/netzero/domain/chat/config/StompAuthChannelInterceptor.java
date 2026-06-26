package com.inha.netzero.domain.chat.config;

import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import com.inha.netzero.global.exception.BusinessException;
import com.inha.netzero.global.exception.ErrorCode;
import com.inha.netzero.global.security.JwtTokenProvider;

/**
 * STOMP CONNECT 프레임의 Authorization(Bearer) JWT 를 검증해 세션 Principal(userId)을 설정한다.
 * 이후 SEND 프레임은 세션에 저장된 Principal 을 @MessageMapping 핸들러로 주입받는다.
 * 토큰이 없거나 유효하지 않으면 CONNECT 를 거부한다(/ws 는 HTTP 레벨 permitAll 이므로 여기서 인증한다).
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;

    public StompAuthChannelInterceptor(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = resolveToken(accessor.getFirstNativeHeader("Authorization"));
            if (token == null || !jwtTokenProvider.validate(token)) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED);
            }
            Long userId = jwtTokenProvider.getUserId(token);
            accessor.setUser(new UsernamePasswordAuthenticationToken(userId, null, List.of()));
        }
        return message;
    }

    private String resolveToken(String header) {
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
