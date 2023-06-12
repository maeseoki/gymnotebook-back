package com.victorc.gymnotebook.payload.response;

import java.util.Set;

import com.victorc.gymnotebook.models.Role;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
	
	public Long id;

	public String username;

	public String email;

	public Set<Role> roles;
}
