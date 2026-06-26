package com.inha.netzero.global.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 컨트롤러 파라미터에 인증된 본인 userId(Long)를 주입한다.
 * 예) public ... me(@CurrentUserId Long userId) { ... }
 * 값은 JwtAuthenticationFilter 가 SecurityContext 에 심은 principal(Long)에서 온다.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface CurrentUserId {
}
