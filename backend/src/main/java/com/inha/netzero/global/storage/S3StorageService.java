package com.inha.netzero.global.storage;

import java.time.Duration;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/**
 * S3 이미지 저장 연동(presigned URL 발급).
 *
 * <p>업로드는 클라이언트가 발급받은 {@code uploadUrl} 로 S3 에 직접 PUT 한다(EC2 대역폭 절감).
 * 백엔드는 URL 발급/키 생성만 담당하고 이미지 바이트는 저장하지 않는다. DB 에는 {@code fileUrl} 만 저장.
 *
 * <p>키 구조: {@code <prefix>/<uuid>.<ext>} (예: {@code market/uuid.jpg}, {@code profile/123.jpg}).
 * 버킷명은 {@code app.s3.bucket}(환경변수 {@code APP_S3_BUCKET}, {username} 시작) 로 주입한다.
 *
 * <p>비공개 버킷 전제: 업로드는 {@link #presignUpload}(PUT), 조회/표시는 {@link #presignDownload}(GET)
 * 로 매번 단기 presigned URL 을 발급한다. 평문 객체 URL 로는 직접 접근할 수 없다(403).
 */
@Service
public class S3StorageService {

    private final S3Presigner presigner;
    private final String bucket;
    private final Region region;
    private final Duration presignExpiry;
    private final Duration downloadExpiry;

    public S3StorageService(S3Presigner presigner,
                            Region awsRegion,
                            @Value("${app.s3.bucket}") String bucket,
                            @Value("${app.s3.presign-expiry-seconds}") long presignExpirySeconds,
                            @Value("${app.s3.download-expiry-seconds}") long downloadExpirySeconds) {
        this.presigner = presigner;
        this.region = awsRegion;
        this.bucket = bucket;
        this.presignExpiry = Duration.ofSeconds(presignExpirySeconds);
        this.downloadExpiry = Duration.ofSeconds(downloadExpirySeconds);
    }

    /**
     * 새 객체 키({@code prefix/uuid.ext})를 만들고 그에 대한 presigned PUT URL 을 발급한다.
     *
     * @param keyPrefix   키 prefix(예: {@code market}, {@code profile}, {@code marketplace})
     * @param fileName    원본 파일명(확장자 추출용)
     * @param contentType 업로드 시 클라이언트가 보낼 Content-Type(서명에 포함되므로 PUT 시 동일 헤더 필요)
     */
    public S3PresignResult presignUpload(String keyPrefix, String fileName, String contentType) {
        if (!StringUtils.hasText(bucket)) {
            throw new IllegalStateException("app.s3.bucket(APP_S3_BUCKET) 가 설정되지 않았습니다.");
        }
        String key = keyPrefix + "/" + UUID.randomUUID() + "." + extension(fileName, contentType);

        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(presignExpiry)
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);

        return new S3PresignResult(key, presigned.url().toString(), fileUrl(key), presignExpiry.toSeconds());
    }

    /**
     * 비공개 버킷 객체에 대한 조회용 presigned GET URL 을 발급한다. 응답에 이미지 URL 을 채울 때마다 호출.
     * 서명 권한은 IAM Role 의 {@code s3:GetObject}. 유효시간은 {@code app.s3.download-expiry-seconds}.
     *
     * @param key DB 에 저장해 둔 객체 키({@link S3PresignResult#key()})
     */
    public String presignDownload(String key) {
        if (!StringUtils.hasText(bucket)) {
            throw new IllegalStateException("app.s3.bucket(APP_S3_BUCKET) 가 설정되지 않았습니다.");
        }
        GetObjectRequest objectRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(downloadExpiry)
                .getObjectRequest(objectRequest)
                .build();

        PresignedGetObjectRequest presigned = presigner.presignGetObject(presignRequest);
        return presigned.url().toString();
    }

    /** 객체의 평문 URL(virtual-hosted style). 비공개 버킷이면 직접 접근 불가 — 참조/디버깅용. */
    private String fileUrl(String key) {
        return "https://" + bucket + ".s3." + region.id() + ".amazonaws.com/" + key;
    }

    /** 파일명에서 확장자 추출, 없으면 Content-Type 으로 보정, 그래도 없으면 {@code bin}. */
    private String extension(String fileName, String contentType) {
        if (StringUtils.hasText(fileName)) {
            String ext = StringUtils.getFilenameExtension(fileName);
            if (StringUtils.hasText(ext)) {
                return ext.toLowerCase();
            }
        }
        if (StringUtils.hasText(contentType)) {
            int slash = contentType.indexOf('/');
            if (slash >= 0 && slash < contentType.length() - 1) {
                String subtype = contentType.substring(slash + 1).toLowerCase();
                return "jpeg".equals(subtype) ? "jpg" : subtype;
            }
        }
        return "bin";
    }
}
