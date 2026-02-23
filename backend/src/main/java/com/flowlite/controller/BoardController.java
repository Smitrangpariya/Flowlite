package com.flowlite.controller;

import com.flowlite.dto.BoardLimitsResponse;
import com.flowlite.dto.BoardRequest;
import com.flowlite.dto.BoardResponse;
import com.flowlite.entity.User;
import com.flowlite.service.BoardService;
import com.flowlite.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Boards", description = "Board management - team and personal boards with limits")
@SecurityRequirement(name = "bearerAuth")
public class BoardController {

    private final BoardService boardService;
    private final UserService userService;

    @GetMapping("/limits")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get board limits", description = "Returns current user's board usage and limits")
    public ResponseEntity<BoardLimitsResponse> getBoardLimits() {
        return ResponseEntity.ok(boardService.getBoardLimits());
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all visible boards",
               description = "Returns team boards in user's org + user's personal boards")
    public ResponseEntity<List<BoardResponse>> getVisibleBoards() {
        return ResponseEntity.ok(boardService.getVisibleBoards());
    }

    @GetMapping("/team")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get team boards only")
    public ResponseEntity<List<BoardResponse>> getTeamBoards() {
        return ResponseEntity.ok(boardService.getTeamBoards());
    }

    @GetMapping("/personal")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get my personal boards")
    public ResponseEntity<List<BoardResponse>> getMyPersonalBoards() {
        return ResponseEntity.ok(boardService.getMyPersonalBoards());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get board by ID")
    public ResponseEntity<BoardResponse> getBoardById(@PathVariable Long id) {
        return ResponseEntity.ok(boardService.getBoardById(id));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create board",
               description = "Create team board (admins only) or personal board (anyone, within limit)")
    public ResponseEntity<BoardResponse> createBoard(@Valid @RequestBody BoardRequest request) {
        User currentUser = userService.getCurrentUser();

        log.info("createBoard: user={} role={} boardType={}",
                currentUser.getUsername(), currentUser.getRole(), request.getBoardType());

        // Role check is handled inside BoardService.createBoard() — no duplicate guard here
        return ResponseEntity.ok(boardService.createBoard(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update board")
    public ResponseEntity<BoardResponse> updateBoard(@PathVariable Long id,
                                                      @Valid @RequestBody BoardRequest request) {
        return ResponseEntity.ok(boardService.updateBoard(id, request));
    }

    @PutMapping("/{id}/set-default")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Set as default board", description = "Set personal board as default for quick task creation")
    public ResponseEntity<Void> setAsDefaultBoard(@PathVariable Long id) {
        boardService.setAsDefaultBoard(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/reorder")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Reorder personal boards", description = "Update display order of personal boards")
    public ResponseEntity<Void> reorderBoards(@RequestBody List<Long> boardIds) {
        boardService.reorderBoards(boardIds);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete board")
    public ResponseEntity<Void> deleteBoard(@PathVariable Long id) {
        boardService.deleteBoard(id);
        return ResponseEntity.ok().build();
    }
}
