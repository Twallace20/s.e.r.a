# ChatGPT Artifact Download Selector Contract

S.E.R.A. must not click arbitrary page text. Artifact download clicks are allowed only when the candidate is a clickable element and the surrounding context supports the expected ZIP.

## Candidate evidence

A candidate may be accepted when:

1. It is an `a`, `button`, or `[role=button]`.
2. It is visible.
3. It is outside `pre` and `code` blocks.
4. Its own text, href, or ancestor/card context mentions the expected ZIP name or stem, or it is a download control in a matching assistant response.
5. It wins scoring against other visible candidates.

## Download landing

The bridge should request Chrome to save into `13_chatgpt_downloads`. If Chrome saves to normal Downloads or the CDP profile Downloads folder, the bridge may move the expected ZIP into `13_chatgpt_downloads` and record that move in evidence.

## Fail closed

If the candidate is ambiguous, missing, invisible, or no ZIP appears after clicking, the bridge writes blocked evidence and needs-attention.
