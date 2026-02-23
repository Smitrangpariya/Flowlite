package com.flowlite.repository;

import com.flowlite.entity.Board;
import com.flowlite.entity.BoardType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BoardRepository extends JpaRepository<Board, Long> {

    /**
     * Find all boards visible to user (team boards in org + user's personal boards)
     * Sorted by: Personal boards first, then by display order
     */
    @Query("""
        SELECT b FROM Board b
        WHERE b.isActive = true
        AND (
            (b.boardType = 'TEAM' AND b.organization.id = :orgId)
            OR
            (b.boardType = 'PERSONAL' AND b.owner.id = :userId)
        )
        ORDER BY b.boardType DESC, b.displayOrder ASC, b.createdAt DESC
    """)
    List<Board> findVisibleBoards(@Param("orgId") Long orgId, @Param("userId") Long userId);

    /** Find team boards in organization */
    List<Board> findByOrganizationIdAndBoardTypeAndIsActiveTrue(Long orgId, BoardType boardType);

    /** Find user's personal boards */
    List<Board> findByOwnerIdAndBoardTypeAndIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc(Long ownerId, BoardType boardType);

    /** Count user's personal boards */
    int countByOwnerIdAndBoardTypeAndIsActiveTrue(Long ownerId, BoardType boardType);

    /** Count organization's team boards */
    int countByOrganizationIdAndBoardTypeAndIsActiveTrue(Long orgId, BoardType boardType);

    /** Check if board is accessible by user */
    @Query("""
        SELECT b FROM Board b
        WHERE b.id = :boardId
        AND b.isActive = true
        AND (
            (b.boardType = 'TEAM' AND b.organization.id = :orgId)
            OR
            (b.boardType = 'PERSONAL' AND b.owner.id = :userId)
        )
    """)
    Optional<Board> findAccessibleBoard(@Param("boardId") Long boardId,
                                        @Param("orgId") Long orgId,
                                        @Param("userId") Long userId);

    /** Find user's default board */
    Optional<Board> findByOwnerIdAndIsDefaultTrueAndIsActiveTrue(Long ownerId);

    /** Legacy: find by org */
    List<Board> findByOrganizationId(Long organizationId);

    Optional<Board> findByIdAndOrganizationId(Long id, Long organizationId);
}
