package com.inha.netzero.domain.ai.client;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.ContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ConversationRole;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseResponse;
import software.amazon.awssdk.services.bedrockruntime.model.ImageBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ImageFormat;
import software.amazon.awssdk.services.bedrockruntime.model.ImageSource;
import software.amazon.awssdk.services.bedrockruntime.model.InferenceConfiguration;
import software.amazon.awssdk.services.bedrockruntime.model.Message;
import software.amazon.awssdk.services.bedrockruntime.model.SystemContentBlock;

/**
 * Amazon Nova Lite(Bedrock Converse API) 호출 래퍼.
 *
 * <p>모델 ID/리전/타임아웃 등 인프라 관심사를 한 곳에 모은다. 도메인 서비스(market/marketplace 등)는
 * 직접 SDK 를 만지지 않고 이 래퍼(또는 추후 {@code LlmService})만 호출한다.
 *
 * <p>자격증명은 IAM Role(클라이언트 빈의 {@code DefaultCredentialsProvider})로만 획득한다.
 * 타임아웃/예외 처리(폴백)는 호출하는 도메인 서비스가 빈 결과로 흡수한다 — 본 기능을 막지 않는다.
 */
@Component
public class BedrockClient {

    private final BedrockRuntimeClient client;
    private final String modelId;
    private final int maxTokens;
    private final float temperature;

    public BedrockClient(BedrockRuntimeClient client,
                         @Value("${app.bedrock.model-id}") String modelId,
                         @Value("${app.bedrock.max-tokens}") int maxTokens,
                         @Value("${app.bedrock.temperature}") float temperature) {
        this.client = client;
        this.modelId = modelId;
        this.maxTokens = maxTokens;
        this.temperature = temperature;
    }

    /** 텍스트 전용 Converse. 시스템 지시 + 유저 프롬프트 → 모델 응답 텍스트. */
    public String converse(String systemPrompt, String userText) {
        return converse(systemPrompt, ContentBlock.fromText(userText));
    }

    /**
     * 멀티모달 Converse(이미지 inline + 텍스트). LLM-1 판매글 초안 등에서 사용.
     *
     * @param imageBytes  원본 이미지 바이트(S3 업로드 전 inline 전달 가능)
     * @param imageFormat {@code "jpeg"} / {@code "png"} 등
     */
    public String converseWithImage(String systemPrompt, String userText, byte[] imageBytes, String imageFormat) {
        ImageBlock image = ImageBlock.builder()
                .format(ImageFormat.fromValue(normalizeFormat(imageFormat)))
                .source(ImageSource.fromBytes(SdkBytes.fromByteArray(imageBytes)))
                .build();
        return converse(systemPrompt,
                ContentBlock.fromImage(image),
                ContentBlock.fromText(userText));
    }

    private String converse(String systemPrompt, ContentBlock... userContent) {
        Message userMessage = Message.builder()
                .role(ConversationRole.USER)
                .content(userContent)
                .build();

        ConverseResponse response = client.converse(request -> request
                .modelId(modelId)
                .system(SystemContentBlock.fromText(systemPrompt))
                .messages(userMessage)
                .inferenceConfig(InferenceConfiguration.builder()
                        .maxTokens(maxTokens)
                        .temperature(temperature)
                        .build()));

        return extractText(response);
    }

    /** 응답 메시지의 텍스트 블록만 이어붙여 반환. */
    private String extractText(ConverseResponse response) {
        List<ContentBlock> blocks = response.output().message().content();
        return blocks.stream()
                .map(ContentBlock::text)
                .filter(text -> text != null)
                .collect(Collectors.joining())
                .trim();
    }

    private String normalizeFormat(String imageFormat) {
        if (imageFormat == null) {
            return "jpeg";
        }
        String f = imageFormat.toLowerCase();
        return "jpg".equals(f) ? "jpeg" : f;
    }
}
