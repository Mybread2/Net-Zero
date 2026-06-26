package com.inha.netzero.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.inha.netzero.domain.auth.handler.OAuth2LoginSuccessHandler;
import com.inha.netzero.domain.auth.service.CustomOAuth2UserService;
import com.inha.netzero.global.security.JwtAuthenticationFilter;
import com.inha.netzero.global.security.JwtTokenProvider;

/**
 * 보안 설정. Google OAuth2 로그인(서버사이드 리다이렉트) + 무상태 JWT API 인증.
 * - 로그인 진입: GET /oauth2/authorization/google
 * - 콜백: /login/oauth2/code/google → 성공 핸들러가 JWT 발급 후 프론트로 리다이렉트
 * - API 요청: Authorization: Bearer &lt;JWT&gt; (JwtAuthenticationFilter)
 */
@Configuration
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    private final JwtTokenProvider jwtTokenProvider;

    public SecurityConfig(CustomOAuth2UserService customOAuth2UserService,
                          OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler,
                          JwtTokenProvider jwtTokenProvider) {
        this.customOAuth2UserService = customOAuth2UserService;
        this.oAuth2LoginSuccessHandler = oAuth2LoginSuccessHandler;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                // OAuth2 인가 요청(state) 저장을 위해 핸드셰이크 중에는 세션 허용(IF_REQUIRED).
                // API 인증은 매 요청 JWT 로 처리하므로 사실상 무상태로 동작한다.
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(auth -> auth
                        // "/ws/**": STOMP 핸드셰이크. 인증은 STOMP CONNECT 프레임에서 별도 처리(chat 도메인).
                        .requestMatchers("/api/health", "/error", "/oauth2/**", "/login/**", "/ws/**").permitAll()
                        .anyRequest().authenticated())
                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                        .successHandler(oAuth2LoginSuccessHandler))
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
