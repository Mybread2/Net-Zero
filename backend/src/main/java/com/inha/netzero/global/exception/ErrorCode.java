package com.inha.netzero.global.exception;

import org.springframework.http.HttpStatus;

/**
 * 공통 에러 코드. HTTP status + code(enum 이름) + 기본 메시지를 묶는다.
 * GlobalExceptionHandler 가 BusinessException 을 이 코드 기준으로 ApiResponse(error) 로 변환한다.
 */
public enum ErrorCode {

    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "권한이 없습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "대상을 찾을 수 없습니다."),
    CONFLICT(HttpStatus.CONFLICT, "이미 처리된 요청입니다."),
    LLM_UNAVAILABLE(HttpStatus.BAD_GATEWAY, "LLM 서비스를 사용할 수 없습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus getStatus() {
        return status;
    }

    /** 응답 body 의 code 값. enum 이름과 동일. */
    public String getCode() {
        return name();
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }
}
