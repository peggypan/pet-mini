function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function snapshotFromClub(clubDoc, extra = {}) {
  const c = clubDoc || {};
  return {
    clubId: String(c._id || c.id || extra.clubId || ''),
    clubName: trim(c.name) || trim(extra.clubName) || '俱乐部',
    clubCity: trim(c.city) || trim(extra.clubCity) || '',
    clubCover: trim(c.cover) || trim(extra.clubCover) || '',
    clubIntro: trim(c.intro) || trim(extra.clubIntro) || '',
  };
}

function publicClubMember(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  const clubId = String(rest.clubId || '');
  return {
    id: _id,
    membershipId: _id,
    clubId,
    clubName: rest.clubName,
    userId: rest.userId,
    userNickname: rest.userNickname,
    role: rest.role || 'member',
    joinedAt: rest.joinedAt,
    isMine: !!isMine,
    club: {
      id: clubId,
      name: rest.clubName,
      city: rest.clubCity || '',
      cover: rest.clubCover || '',
      intro: rest.clubIntro || '',
      members: rest.clubMemberCount,
    },
  };
}

function toJoinedClubCard(memberRow) {
  if (!memberRow) return null;
  const pub = memberRow.club ? memberRow : publicClubMember(memberRow);
  const club = pub.club || {};
  return {
    id: pub.clubId || club.id,
    membershipId: pub.id || pub.membershipId,
    name: pub.clubName || club.name,
    city: club.city || pub.clubCity || '',
    cover: club.cover || pub.clubCover || '',
    intro: club.intro || pub.clubIntro || '',
    owner: '',
    members: club.members,
    role: pub.role,
    joinedAt: pub.joinedAt,
  };
}

module.exports = {
  snapshotFromClub,
  publicClubMember,
  toJoinedClubCard,
};
