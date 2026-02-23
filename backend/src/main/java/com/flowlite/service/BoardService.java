package com.flowlite.service;

import com.flowlite.config.BoardLimitConfig;
import com.flowlite.dto.BoardLimitsResponse;
import com.flowlite.dto.BoardRequest;
import com.flowlite.dto.BoardResponse;
import com.flowlite.entity.Board;
import com.flowlite.entity.BoardType;
import com.flowlite.entity.Organization;
import com.flowlite.entity.TaskStatus;
import com.flowlite.entity.User;
import com.flowlite.exception.BoardLimitExceededException;
import com.flowlite.repository.BoardRepository;
import com.flowlite.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BoardService {

    private final BoardRepository boardRepository;
    private final TaskRepository taskRepository;
    private final UserService userService;
    private final BoardLimitConfig boardLimitConfig;

    @Transactional(readOnly = true)
    public BoardLimitsResponse getBoardLimits() {
        User currentUser = userService.getCurrentUser();
        Organization org = currentUser.getOrganization();

        BoardLimitsResponse limits = new BoardLimitsResponse();
        limits.setLimitsEnforced(boardLimitConfig.isEnforceLimits());

        // Personal boards
        int personalCount = boardRepository.countByOwnerIdAndBoardTypeAndIsActiveTrue(
            currentUser.getId(), BoardType.PERSONAL
        );
        limits.setPersonalBoardsUsed(personalCount);
        limits.setPersonalBoardsLimit(boardLimitConfig.getMaxPersonalBoardsPerUser());
        limits.setPersonalBoardsRemaining(
            Math.max(0, boardLimitConfig.getMaxPersonalBoardsPerUser() - personalCount)
        );
        limits.setCanCreatePersonalBoard(
            !boardLimitConfig.isEnforceLimits() ||
            personalCount < boardLimitConfig.getMaxPersonalBoardsPerUser()
        );

        // Team boards
        int teamCount = boardRepository.countByOrganizationIdAndBoardTypeAndIsActiveTrue(
            org.getId(), BoardType.TEAM
        );
        limits.setTeamBoardsUsed(teamCount);
        limits.setTeamBoardsLimit(boardLimitConfig.getMaxTeamBoardsPerOrg());
        limits.setCanCreateTeamBoard(
            userService.isAdminOrManager(currentUser) && (
                !boardLimitConfig.isEnforceLimits() ||
                boardLimitConfig.getMaxTeamBoardsPerOrg() == -1 ||
                teamCount < boardLimitConfig.getMaxTeamBoardsPerOrg()
            )
        );

        return limits;
    }

    private void checkBoardLimit(User user, BoardType boardType) {
        if (!boardLimitConfig.isEnforceLimits()) {
            return;
        }

        if (boardType == BoardType.PERSONAL) {
            int currentCount = boardRepository.countByOwnerIdAndBoardTypeAndIsActiveTrue(
                user.getId(), BoardType.PERSONAL
            );
            int limit = boardLimitConfig.getMaxPersonalBoardsPerUser();
            if (currentCount >= limit) {
                throw new BoardLimitExceededException(
                    String.format(
                        "Personal board limit reached. You can create up to %d personal boards. " +
                        "Delete unused boards or upgrade your plan.", limit
                    )
                );
            }
        } else if (boardType == BoardType.TEAM) {
            int maxTeamBoards = boardLimitConfig.getMaxTeamBoardsPerOrg();
            if (maxTeamBoards == -1) return;

            int currentCount = boardRepository.countByOrganizationIdAndBoardTypeAndIsActiveTrue(
                user.getOrganization().getId(), BoardType.TEAM
            );
            if (currentCount >= maxTeamBoards) {
                throw new BoardLimitExceededException(
                    String.format(
                        "Team board limit reached. Organization can create up to %d team boards.",
                        maxTeamBoards
                    )
                );
            }
        }
    }

    @Transactional(readOnly = true)
    public List<BoardResponse> getVisibleBoards() {
        User currentUser = userService.getCurrentUser();
        Organization org = currentUser.getOrganization();
        List<Board> boards = boardRepository.findVisibleBoards(org.getId(), currentUser.getId());
        return boards.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BoardResponse> getTeamBoards() {
        User currentUser = userService.getCurrentUser();
        Organization org = currentUser.getOrganization();
        return boardRepository.findByOrganizationIdAndBoardTypeAndIsActiveTrue(org.getId(), BoardType.TEAM)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BoardResponse> getMyPersonalBoards() {
        User currentUser = userService.getCurrentUser();
        return boardRepository.findByOwnerIdAndBoardTypeAndIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc(
                currentUser.getId(), BoardType.PERSONAL)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public BoardResponse createBoard(BoardRequest request) {
        User currentUser = userService.getCurrentUser();
        Organization org = currentUser.getOrganization();

        if (BoardType.TEAM.equals(request.getBoardType())) {
            if (!userService.isAdminOrManager(currentUser)) {
                throw new org.springframework.security.access.AccessDeniedException("TEAM_BOARD_CREATE_FORBIDDEN");
            }
        }

        checkBoardLimit(currentUser, request.getBoardType());

        Board board = new Board();
        board.setName(request.getName());
        board.setDescription(request.getDescription());
        board.setBoardType(request.getBoardType());
        board.setOrganization(org);
        board.setBoardColor(request.getBoardColor());
        board.setBoardIcon(request.getBoardIcon());
        board.setDisplayOrder(request.getDisplayOrder());

        if (BoardType.PERSONAL.equals(request.getBoardType())) {
            board.setOwner(currentUser);
            if (Boolean.TRUE.equals(request.getIsDefault())) {
                setAsDefaultBoard(currentUser, board);
            }
            log.info("Personal board created: '{}' for user: {}", board.getName(), currentUser.getUsername());
        } else {
            log.info("Team board created: '{}' in org: {}", board.getName(), org.getName());
        }

        board = boardRepository.save(board);
        return toResponse(board);
    }

    @Transactional
    public BoardResponse updateBoard(Long boardId, BoardRequest request) {
        User currentUser = userService.getCurrentUser();
        Organization org = currentUser.getOrganization();

        Board board = boardRepository.findAccessibleBoard(boardId, org.getId(), currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Board not found or access denied"));

        checkBoardUpdatePermission(currentUser, board);

        board.setName(request.getName());
        board.setDescription(request.getDescription());
        board.setBoardColor(request.getBoardColor());
        board.setBoardIcon(request.getBoardIcon());
        board.setDisplayOrder(request.getDisplayOrder());
        board.setUpdatedAt(LocalDateTime.now());

        if (board.isPersonal() && Boolean.TRUE.equals(request.getIsDefault())) {
            setAsDefaultBoard(currentUser, board);
        }

        board = boardRepository.save(board);
        log.info("Board updated: {} by user: {}", boardId, currentUser.getUsername());
        return toResponse(board);
    }

    @Transactional
    public void setAsDefaultBoard(Long boardId) {
        User currentUser = userService.getCurrentUser();
        Organization org = currentUser.getOrganization();

        Board board = boardRepository.findAccessibleBoard(boardId, org.getId(), currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Board not found or access denied"));

        if (!board.isPersonal()) {
            throw new RuntimeException("Only personal boards can be set as default");
        }
        if (!board.getOwner().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Access denied: You can only set your own boards as default");
        }

        setAsDefaultBoard(currentUser, board);
        boardRepository.save(board);
    }

    private void setAsDefaultBoard(User user, Board newDefaultBoard) {
        boardRepository.findByOwnerIdAndIsDefaultTrueAndIsActiveTrue(user.getId())
                .ifPresent(existingDefault -> {
                    existingDefault.setIsDefault(false);
                    boardRepository.save(existingDefault);
                });
        newDefaultBoard.setIsDefault(true);
    }

    @Transactional
    public void deleteBoard(Long boardId) {
        User currentUser = userService.getCurrentUser();
        Organization org = currentUser.getOrganization();

        Board board = boardRepository.findAccessibleBoard(boardId, org.getId(), currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Board not found or access denied"));

        checkBoardUpdatePermission(currentUser, board);

        board.setIsActive(false);
        boardRepository.save(board);
        log.info("Board deleted: {} by user: {}", boardId, currentUser.getUsername());
    }

    @Transactional(readOnly = true)
    public BoardResponse getBoardById(Long boardId) {
        User currentUser = userService.getCurrentUser();
        Organization org = currentUser.getOrganization();
        Board board = boardRepository.findAccessibleBoard(boardId, org.getId(), currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Board not found or access denied"));
        return toResponse(board);
    }

    @Transactional
    public void reorderBoards(List<Long> boardIds) {
        User currentUser = userService.getCurrentUser();
        for (int i = 0; i < boardIds.size(); i++) {
            final int order = i;
            boardRepository.findById(boardIds.get(i)).ifPresent(board -> {
                if (board.isPersonal() && board.getOwner().getId().equals(currentUser.getId())) {
                    board.setDisplayOrder(order);
                    boardRepository.save(board);
                }
            });
        }
    }

    private void checkBoardUpdatePermission(User user, Board board) {
        if (board.isPersonal()) {
            if (!board.getOwner().getId().equals(user.getId())) {
                throw new RuntimeException("Access denied: Only the owner can edit this personal board");
            }
        } else {
            if (!userService.isAdminOrManager(user)) {
                throw new RuntimeException("Access denied: Only admins can edit team boards");
            }
        }
    }

    private BoardResponse toResponse(Board board) {
        BoardResponse response = new BoardResponse();
        response.setId(board.getId());
        response.setName(board.getName());
        response.setDescription(board.getDescription());
        response.setBoardType(board.getBoardType());
        response.setOrganizationId(board.getOrganization().getId());
        response.setOrganizationName(board.getOrganization().getName());
        response.setBoardColor(board.getBoardColor());
        response.setBoardIcon(board.getBoardIcon());
        response.setIsDefault(board.getIsDefault());
        response.setDisplayOrder(board.getDisplayOrder());

        if (board.getOwner() != null) {
            response.setOwnerId(board.getOwner().getId());
            response.setOwnerName(board.getOwner().getUsername());
        }

        // Count active tasks on this board
        int taskCount = taskRepository.countByBoardIdAndStatusNotIn(
            board.getId(),
            List.of(TaskStatus.ARCHIVED, TaskStatus.CANCELLED, TaskStatus.DELETED)
        );
        response.setTaskCount(taskCount);

        response.setIsActive(board.getIsActive());
        response.setCreatedAt(board.getCreatedAt());
        response.setUpdatedAt(board.getUpdatedAt());
        return response;
    }
}
