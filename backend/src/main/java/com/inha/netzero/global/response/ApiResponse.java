package com.inha.netzero.global.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import com.inha.netzero.global.exception.ErrorCode;

/**
 * 공통 API 응답 래퍼. { "status": "success"|"error", "data": T, "message": String|null }
 * 실패 시에만 "code"(ErrorCode 이름)를 포함한다.
 */
public class ApiResponse<T> {

    private final String status;
    private final T data;
    private final String message;

    /** 에러일 때만 노출(성공 응답에는 포함하지 않는다). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final String code;

    private ApiResponse(String status, T data, String message, String code) {
        this.status = status;
        this.data = data;
        this.message = message;
        this.code = code;
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>("success", data, null, null);
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>("success", data, message, null);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, String message) {
        return new ApiResponse<>("error", null, message, errorCode.getCode());
    }

    public String getStatus() {
        return status;
    }

    public T getData() {
        return data;
    }

    public String getMessage() {
        return message;
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public String getCode() {
        return code;
    }
}
