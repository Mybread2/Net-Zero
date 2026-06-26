package com.inha.netzero.global.config;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * AWS SDK v2 공통 클라이언트 설정(S3 / Bedrock).
 *
 * <p>보안 하드룰: Access Key/Secret 를 코드·환경변수·설정파일에 절대 주입하지 않는다.
 * 모든 클라이언트는 {@link DefaultCredentialsProvider} 로 자격증명을 자동 획득한다
 * (EC2 instance profile {@code SafeInstanceProfile-{username}} → instance metadata).
 * 리전은 {@code app.aws.region}(기본 us-east-1) 로 고정한다.
 *
 * <p>각 클라이언트 빈은 네트워크/자격증명을 빌드 시점이 아니라 첫 호출 시점에 해석하므로,
 * 로컬(자격증명 없음)에서도 빈 생성 자체는 실패하지 않는다(실제 호출 시에만 인증).
 */
@Configuration
public class AwsConfig {

    /** 공통 자격증명 공급자 — instance metadata/환경/프로파일 체인을 자동 탐색. */
    @Bean
    public AwsCredentialsProvider awsCredentialsProvider() {
        return DefaultCredentialsProvider.create();
    }

    @Bean
    public Region awsRegion(@Value("${app.aws.region}") String region) {
        return Region.of(region);
    }

    @Bean
    public S3Client s3Client(Region awsRegion, AwsCredentialsProvider credentialsProvider) {
        return S3Client.builder()
                .region(awsRegion)
                .credentialsProvider(credentialsProvider)
                .build();
    }

    /** presigned URL 발급 전용 — 클라이언트가 S3 로 직접 PUT/GET 하게 한다(EC2 대역폭 절감). */
    @Bean
    public S3Presigner s3Presigner(Region awsRegion, AwsCredentialsProvider credentialsProvider) {
        return S3Presigner.builder()
                .region(awsRegion)
                .credentialsProvider(credentialsProvider)
                .build();
    }

    /**
     * Bedrock Converse 호출용 클라이언트. 호출 타임아웃을 두어 초과 시 빠르게 폴백할 수 있게 한다.
     * 모델 ID/추론 파라미터는 {@code BedrockClient} 래퍼에서 주입한다.
     */
    @Bean
    public BedrockRuntimeClient bedrockRuntimeClient(Region awsRegion,
                                                     AwsCredentialsProvider credentialsProvider,
                                                     @Value("${app.bedrock.timeout-ms}") long timeoutMs) {
        return BedrockRuntimeClient.builder()
                .region(awsRegion)
                .credentialsProvider(credentialsProvider)
                .overrideConfiguration(ClientOverrideConfiguration.builder()
                        .apiCallTimeout(Duration.ofMillis(timeoutMs))
                        .build())
                .build();
    }
}
