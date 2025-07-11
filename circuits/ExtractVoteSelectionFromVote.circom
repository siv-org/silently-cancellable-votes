pragma circom 2.2.2;

include "ExtractStringFromPoint.circom";

// Given a string with the vote and identifier, extract the vote selection only
template ExtractVoteSelectionFromVote() {
    var bytesPerPoint = 32;
    var maxLength = bytesPerPoint - 1; // 1st byte is for length

    // Input: serialized point as bytes
    signal input pointAsBytes[bytesPerPoint];

    signal stringAsBytes[maxLength] <== ExtractStringFromPoint()(pointAsBytes);

    var START_INDEX = 15; // 15 bytes for verification number

    signal output choice[maxLength - START_INDEX];

    for (var i = START_INDEX; i < maxLength; i++) {
        log(stringAsBytes[i]);
        choice[i - START_INDEX] <== stringAsBytes[i];
    }
}