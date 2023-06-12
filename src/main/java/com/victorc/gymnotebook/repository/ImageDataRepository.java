package com.victorc.gymnotebook.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.victorc.gymnotebook.models.ImageData;
import java.util.List;


public interface ImageDataRepository extends JpaRepository<ImageData, Long> {
	List<ImageData> findByName(String name);
}
