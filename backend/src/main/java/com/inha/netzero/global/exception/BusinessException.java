package com.inha.netzero.global.exception;

/**
 * 도메인 비즈니스 예외. ErrorCode 를 들고 다니며 GlobalExceptionHandler 가
 * 해당 HTTP status + ApiResponse(error) 로 변환한다.
 * 서비스/컨트롤러에서 직접 응답을 만들지 말고 이 예외를 throw 한다.
 */
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}
