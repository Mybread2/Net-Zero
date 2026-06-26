package com.inha.netzero.global.config;

import java.util.List;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.inha.netzero.global.security.CurrentUserIdArgumentResolver;

/**
 * 웹 MVC 공통 설정. @CurrentUserId 아규먼트 리졸버를 등록한다.
 * (CORS 는 CorsConfig 에서 별도로 처리한다.)
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final CurrentUserIdArgumentResolver currentUserIdArgumentResolver;

    public WebConfig(CurrentUserIdArgumentResolver currentUserIdArgumentResolver) {
        this.currentUserIdArgumentResolver = currentUserIdArgumentResolver;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserIdArgumentResolver);
    }
}
