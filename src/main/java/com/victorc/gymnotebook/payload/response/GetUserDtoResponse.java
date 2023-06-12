package com.victorc.gymnotebook.payload.response;

import java.util.Set;

import com.victorc.gymnotebook.models.Role;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
public class GetUserDtoResponse {

	public Long id;

	public String username;

	public String email;

	public String password;

	public Set<Role> roles;

}
