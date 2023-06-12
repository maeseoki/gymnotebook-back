package com.victorc.gymnotebook.controllers;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.victorc.gymnotebook.models.ImageData;
import com.victorc.gymnotebook.repository.ImageDataRepository;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/image")
public class ImageController {

	@Autowired
	private final ImageDataRepository imageDataRepository;

	public ImageController(ImageDataRepository imageDataRepository) {
		this.imageDataRepository = imageDataRepository;
	}

	@GetMapping("/{id}")
	public ResponseEntity<?> getImage(@PathVariable Long id) {
		if (!imageDataRepository.existsById(id)) {
			return ResponseEntity.notFound().build();
		}

		ImageData imageData = imageDataRepository.findById(id).get();
		MediaType mediaType = MediaType.parseMediaType(imageData.getType());
		return ResponseEntity.ok().contentType(mediaType).body(imageData.getData());
	}

	@PostMapping
	public ResponseEntity<?> uploadImage(@RequestParam("image") MultipartFile image) throws IOException {
		if (image.isEmpty()) {
			return ResponseEntity.badRequest().build();
		}

		try {
			ImageData imageData = new ImageData();
			imageData.setName(image.getOriginalFilename());
			imageData.setType(image.getContentType());
			imageData.setData(image.getBytes());

			ImageData savedImageData = imageDataRepository.save(imageData);

			return ResponseEntity.status(HttpStatus.CREATED).body(savedImageData.getId());

		} catch (IOException e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error while saving the image");
		}
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> deleteImage(@PathVariable Long id) {
		if (!imageDataRepository.existsById(id)) {
			return ResponseEntity.notFound().build();
		}

		imageDataRepository.deleteById(id);
		return ResponseEntity.noContent().build();
	}
}
