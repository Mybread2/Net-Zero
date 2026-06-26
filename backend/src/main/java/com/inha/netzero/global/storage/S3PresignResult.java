package com.inha.netzero.global.storage;

/**
 * S3 presigned 업로드 발급 결과.
 *
 * <p>비공개 버킷에서는 DB 에 {@code key}(또는 {@code fileUrl})를 저장해 두고,
 * 화면 표시 시 {@link S3StorageService#presignDownload(String)} 로 조회용 presigned GET URL 을 발급한다.
 *
 * @param key              S3 객체 키({@code prefix/uuid.ext}) — DB 저장/조회 기준값
 * @param uploadUrl        클라이언트가 PUT 으로 직접 업로드할 presigned URL(서명 만료 있음)
 * @param fileUrl          객체의 평문 URL(서명 없음). 비공개 버킷이면 직접 접근 불가(403) — 참조용
 * @param expiresInSeconds uploadUrl 유효 시간(초)
 */
public record S3PresignResult(String key, String uploadUrl, String fileUrl, long expiresInSeconds) {
}
