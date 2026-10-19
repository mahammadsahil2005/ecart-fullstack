package com.ecart.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "http://localhost:5173")
public class FileUploadController {

    private static final Set<String> ALLOWED_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp");

    private static final long MAX_FILE_SIZE =
            5 * 1024 * 1024; // 5 MB

    @Value("${app.upload.dir:uploads}")
    private String uploadDirectory;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadImage(
            @RequestParam("file") MultipartFile file) {

        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Please select an image."));
            }

            if (file.getSize() > MAX_FILE_SIZE) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Image must be 5 MB or smaller."));
            }

            if (!ALLOWED_TYPES.contains(file.getContentType())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Only JPEG, PNG, and WebP images are allowed."));
            }

            String originalName =
                    StringUtils.cleanPath(file.getOriginalFilename() == null
                            ? "image"
                            : file.getOriginalFilename());

            if (originalName.contains("..")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid filename."));
            }

            String extension = switch (file.getContentType()) {
                case "image/jpeg" -> ".jpg";
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                default -> throw new IllegalArgumentException("Unsupported image type.");
            };

            String filename =
                    UUID.randomUUID() + extension;

            Path uploadPath =
                    Paths.get(uploadDirectory).toAbsolutePath().normalize();

            Files.createDirectories(uploadPath);

            Path target =
                    uploadPath.resolve(filename).normalize();

            if (!target.startsWith(uploadPath)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid file path."));
            }

            file.transferTo(target);

            return ResponseEntity.ok(
                    Map.of(
                            "imageUrl", "/uploads/" + filename
                    )
            );

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Unable to save image."));
        }
    }
}