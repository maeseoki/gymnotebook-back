package com.victorc.gymnotebook.payload.request;

import com.victorc.gymnotebook.models.ERole;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModifyRoleRequest {

	@NotBlank
	private Long userId;

	@NotBlank
	private ERole newRole;
}
