import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Subject } from "rxjs";
import { Router } from "@angular/router";
import { Project } from "./project";
import { environment } from "../../environments/environment";
const apiProjects = environment.host + '/projects'

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  constructor(private http: HttpClient, private router: Router) { }
  private projects: Project[] = []
  private stream = new Subject<Project[]>()

  populateProjects(): void {
    this.http.get<Project[]>(apiProjects).subscribe((res) => {
      this.projects = res
      this.stream.next([...this.projects])
    })
  }
  getStream() {
    return this.stream.asObservable()
  }
  getProject(seq: number) {
    return this.http.get<Project>(`${apiProjects}/${seq}`)
  }
  addProject(name: string, status: string, thumbnail: File | null, thumbnailName: string | null, description: string, overview: string | null, technologies: string[], url: string, homepage: string | null, keywords: string[]): void {
    const data = new FormData()
    data.append('name', name)
    data.append('status', status)
    if (thumbnail) data.append('thumbnail', thumbnail, thumbnailName)
    data.append('description', description)
    if (overview) data.append('overview', overview)
    data.append('technologies', JSON.stringify(technologies))
    data.append('url', url)
    if (homepage) data.append('homepage', homepage)
    data.append('keywords', JSON.stringify(keywords))
    this.http.post<{ message: string, project: Project }>(apiProjects, data).subscribe((res) => {
      this.projects.push(res.project)
      this.stream.next([...this.projects])
      console.log(res.message)
      this.router.navigate(['/album', res.project.seq])
    })
  }
  editProject(_id: string, seq: number, name: string, status: string, thumbnail: File | string | null, thumbnailName: string | null, description: string, overview: string | null, technologies: string[], url: string, homepage: string | null, keywords: string[]): void {
    const data = new FormData()
    data.append('_id', _id)
    data.append('seq', seq + '')
    data.append('name', name)
    data.append('status', status)
    if (typeof thumbnail === "object") {
      data.append('thumbnail', thumbnail, thumbnailName)
    } else if (thumbnail) {
      data.append('thumbnailPath', thumbnail)
    }
    data.append('description', description)
    if (overview) data.append('overview', overview)
    data.append('technologies', JSON.stringify(technologies))
    data.append('url', url)
    if (homepage) data.append('homepage', homepage)
    data.append('keywords', JSON.stringify(keywords))
    this.http.put<{ message: string }>(`${apiProjects}/${_id}`, data).subscribe((res) => {
      console.log(res)
      this.router.navigate(['/album'])
    })
  }
  delProject(_id: string) {
    return this.http.delete<{ message: string }>(`${apiProjects}/${_id}`)
  }
}
