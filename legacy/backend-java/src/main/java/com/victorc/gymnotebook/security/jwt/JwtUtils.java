package com.victorc.gymnotebook.security.jwt;


import java.security.Key;
import java.util.Date;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import com.victorc.gymnotebook.security.services.UserDetailsImpl;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtils {
  private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

  @Value("${gymnotebook.jwtSecret}")
  private String jwtSecret;

  @Value("${gymnotebook.jwtExpirationMs}")
  private int jwtExpirationMs;

  public String generateJwtToken(Authentication authentication) {

    UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();

    Claims claims = Jwts.claims().setSubject(userPrincipal.getUsername());
    claims.put("roles", userPrincipal.getAuthorities());

    return Jwts.builder()
        .setClaims(claims)
        .setIssuedAt(new Date())
        .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
        .signWith(getSigningKey())
        .compact();
  }
  
  private Key getSigningKey() {
	  byte[] keyBytes = Decoders.BASE64.decode(this.jwtSecret);
	  return Keys.hmacShaKeyFor(keyBytes);
}

  public String getUserNameFromJwtToken(String token) {
	  Jws<Claims> claimsJws = Jwts.parserBuilder()
	            .setSigningKey(getSigningKey())
	            .build()
	            .parseClaimsJws(token);
	    return claimsJws.getBody().getSubject();
  }

  public boolean validateJwtToken(String authToken) {
    try {
    	Jwts.parserBuilder()
            .setSigningKey(getSigningKey())
            .build()
            .parseClaimsJws(authToken);
        return true;
    } catch (SecurityException e) {
      logger.error("Invalid JWT signature: {}", e.getMessage());
    } catch (MalformedJwtException e) {
      logger.error("Invalid JWT token: {}", e.getMessage());
    } catch (ExpiredJwtException e) {
      logger.error("JWT token is expired: {}", e.getMessage());
    } catch (UnsupportedJwtException e) {
      logger.error("JWT token is unsupported: {}", e.getMessage());
    } catch (IllegalArgumentException e) {
      logger.error("JWT claims string is empty: {}", e.getMessage());
    }

    return false;
  }
}
